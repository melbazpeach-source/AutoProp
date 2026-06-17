import { getDb } from './db';
import { tenancies, tenancyAlerts, communications } from '../drizzle/schema';
import { eq, and, lt, gte, isNull, sql } from 'drizzle-orm';
// [trio] Stream 1 — scheduled jobs build on existing arrears + notification services
import { ArrearsService } from './arrears-service';
import { notifyOwner } from './_core/notification';

/**
 * Automated Alert Trigger Service
 * Checks tenancy conditions and creates alerts automatically
 */

export async function checkAndCreateAlerts() {
  const db = await getDb();
  if (!db) {
    console.error('[Alert Triggers] Database not available');
    return { success: false, created: 0 };
  }

  let totalCreated = 0;

  try {
    // 1. Lease Expiring in 30 Days
    const expiringLeases = await db
      .select()
      .from(tenancies)
      .where(
        and(
          eq(tenancies.status, 'active'),
          lt(tenancies.leaseEndDate, sql`DATE_ADD(NOW(), INTERVAL 30 DAY)`),
          gte(tenancies.leaseEndDate, sql`NOW()`)
        )
      );

    for (const tenancy of expiringLeases) {
      // Check if alert already exists
      const existing = await db
        .select()
        .from(tenancyAlerts)
        .where(
          and(
            eq(tenancyAlerts.tenancyId, tenancy.id),
            eq(tenancyAlerts.alertType, 'lease_expiry'),
            eq(tenancyAlerts.status, 'active')
          )
        );

      if (existing.length === 0) {
        await db.insert(tenancyAlerts).values({
          tenancyId: tenancy.id,
          alertType: 'lease_expiry',
          title: 'Lease Expiring Soon',
          description: `Lease expires on ${tenancy.leaseEndDate?.toLocaleDateString()}. Contact tenant for renewal discussion.`,
          priority: 'high',
          dueDate: tenancy.leaseEndDate,
          status: 'active',
          createdBy: 1, // System user
        });
        totalCreated++;
        console.log(`[Alert Triggers] Created lease expiry alert for tenancy ${tenancy.id}`);
      }
    }

    // 2. Rent 7+ Days Overdue (simulated - would need rent payment tracking)
    // This is a placeholder for when rent payment tracking is implemented
    // Skipping for now as it requires proper rent payment data

    // 3. Inspection Due (90 days since last inspection)
    // This would require an inspections table to track last inspection date
    // Placeholder for future implementation

    // 4. Lease Renewal Reminder (60 days before expiry)
    const renewalReminders = await db
      .select()
      .from(tenancies)
      .where(
        and(
          eq(tenancies.status, 'active'),
          lt(tenancies.leaseEndDate, sql`DATE_ADD(NOW(), INTERVAL 60 DAY)`),
          gte(tenancies.leaseEndDate, sql`DATE_ADD(NOW(), INTERVAL 30 DAY)`)
        )
      );

    for (const tenancy of renewalReminders) {
      const existing = await db
        .select()
        .from(tenancyAlerts)
        .where(
          and(
            eq(tenancyAlerts.tenancyId, tenancy.id),
            eq(tenancyAlerts.alertType, 'lease_expiry'),
            eq(tenancyAlerts.status, 'active')
          )
        );

      if (existing.length === 0) {
        await db.insert(tenancyAlerts).values({
          tenancyId: tenancy.id,
          alertType: 'lease_expiry',
          title: 'Lease Renewal Discussion Due',
          description: `Lease expires in 60 days. Schedule renewal discussion with tenant.`,
          priority: 'medium',
          dueDate: sql`DATE_ADD(NOW(), INTERVAL 30 DAY)`,
          status: 'active',
          createdBy: 1,
        });
        totalCreated++;
        console.log(`[Alert Triggers] Created renewal reminder for tenancy ${tenancy.id}`);
      }
    }

    console.log(`[Alert Triggers] Check complete. Created ${totalCreated} new alerts.`);
    return { success: true, created: totalCreated };

  } catch (error) {
    console.error('[Alert Triggers] Error checking alerts:', error);
    return { success: false, created: totalCreated, error };
  }
}

/**
 * [trio] Stream 1 — Arrears Chase
 * For every overdue arrears row, create a `rent_arrears` tenancyAlert (reusing the
 * existing active-alert dedupe pattern). The tenancyAlerts FK is tenancyId, but arrears
 * rows only carry tenantId + propertyId, so resolve the matching tenancy first. Rows
 * with no resolvable tenancy are skipped + logged.
 */
export async function runArrearsChase() {
  const db = await getDb();
  if (!db) {
    console.error('[Arrears Chase] Database not available');
    return { created: 0 };
  }

  let created = 0;

  const overdue = await ArrearsService.checkOverdueArrears();

  for (const row of overdue) {
    const daysOverdue = row.arrears.daysOverdue;
    const priority = daysOverdue >= 30 ? 'high' : 'medium';

    // Resolve the tenancy for the tenancyAlerts.tenancyId FK (arrears has no tenancyId).
    const tenantId = row.arrears.tenantId;
    const propertyId = row.arrears.propertyId;
    const matchedTenancies = await db
      .select()
      .from(tenancies)
      .where(
        and(
          eq(tenancies.tenantId, tenantId),
          eq(tenancies.propertyId, propertyId)
        )
      )
      .limit(1);

    const tenancy = matchedTenancies[0];
    if (!tenancy) {
      console.log(
        `[Arrears Chase] Skipping arrears ${row.arrears.id}: no tenancy found for tenant ${tenantId} / property ${propertyId}`
      );
      continue;
    }

    // Reuse the existing active-alert dedupe pattern.
    const existing = await db
      .select()
      .from(tenancyAlerts)
      .where(
        and(
          eq(tenancyAlerts.tenancyId, tenancy.id),
          eq(tenancyAlerts.alertType, 'rent_arrears'),
          eq(tenancyAlerts.status, 'active')
        )
      );

    if (existing.length === 0) {
      await db.insert(tenancyAlerts).values({
        tenancyId: tenancy.id,
        alertType: 'rent_arrears',
        title: 'Rent Arrears',
        description: `Rent is ${daysOverdue} days overdue. Amount owed: $${row.arrears.amountOwed}.`,
        priority,
        status: 'active',
        createdBy: 1, // System user
      });
      created++;
      console.log(
        `[Arrears Chase] Created rent_arrears alert for tenancy ${tenancy.id} (${priority})`
      );
    }
  }

  console.log(`[Arrears Chase] Complete. Created ${created} new alerts.`);
  return { created };
}

/**
 * [trio] Stream 1 — Daily Summary
 * Build a plain-text arrears digest and dispatch it via the owner notification service.
 * Never throws if notifyOwner returns false (service unreachable).
 */
export async function runDailySummary() {
  const summary = await ArrearsService.getDailySummary();

  const body = [
    'Daily Arrears Summary',
    '',
    `Total overdue: ${summary.totalOverdue}`,
    `Total amount owed: $${summary.totalAmountOwed.toFixed(2)}`,
    `Critical (30+ days): ${summary.critical.length}`,
    `Warning (10-29 days): ${summary.warning.length}`,
  ].join('\n');

  const sent = await notifyOwner({
    title: 'Daily Arrears Summary',
    content: body,
  });

  if (!sent) {
    console.warn('[Daily Summary] Owner notification was not delivered.');
  }

  return { sent, summary };
}

/**
 * [trio] Stream 1 — Schedule runArrearsChase + runDailySummary daily at 09:00 local.
 * Computes the ms until the next 09:00, fires both jobs (each wrapped in try/catch),
 * then repeats every 24h via setInterval. Mirrors scheduleAlertChecks' lifecycle.
 */
export function scheduleNineAmJobs() {
  console.log('[Arrears Chase]/[Daily Summary] 9am job scheduler initialized');

  const runBoth = async () => {
    try {
      await runArrearsChase();
    } catch (error) {
      console.error('[Arrears Chase] Error:', error);
    }
    try {
      await runDailySummary();
    } catch (error) {
      console.error('[Daily Summary] Error:', error);
    }
  };

  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  const msUntilNine = next.getTime() - now.getTime();

  setTimeout(() => {
    runBoth();
    setInterval(runBoth, 24 * 60 * 60 * 1000);
  }, msUntilNine);
}

/**
 * Schedule this function to run daily via cron or scheduled job
 * Example: Run every day at 9 AM
 */
export function scheduleAlertChecks() {
  // This would be called from a cron job or scheduled task
  // For now, it can be manually triggered or called on server start
  console.log('[Alert Triggers] Alert trigger service initialized');
  
  // Run immediately on startup
  checkAndCreateAlerts();
  
  // Then run every 24 hours
  setInterval(checkAndCreateAlerts, 24 * 60 * 60 * 1000);
}
