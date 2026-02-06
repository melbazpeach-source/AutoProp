import { getDb } from './db';
import { tenancies, tenancyAlerts, communications } from '../drizzle/schema';
import { eq, and, lt, gte, isNull, sql } from 'drizzle-orm';

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
