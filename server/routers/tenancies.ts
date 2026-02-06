import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { tenancies, tenancyAlerts, properties, tenants } from '../../drizzle/schema';
import { eq, and, like, or, desc, asc, sql } from 'drizzle-orm';

export const tenanciesRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(['active', 'ending', 'terminated', 'completed', 'all']).optional(),
      flagged: z.boolean().optional(),
      pinned: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select({
          tenancy: tenancies,
          property: properties,
          tenant: tenants,
        })
        .from(tenancies)
        .leftJoin(properties, eq(tenancies.propertyId, properties.id))
        .leftJoin(tenants, eq(tenancies.tenantId, tenants.id))
        .$dynamic();

      const filters = [];

      if (input?.status && input.status !== 'all') {
        filters.push(eq(tenancies.status, input.status));
      }

      if (input?.flagged !== undefined) {
        filters.push(eq(tenancies.isFlagged, input.flagged));
      }

      if (input?.pinned !== undefined) {
        filters.push(eq(tenancies.isPinned, input.pinned));
      }

      if (input?.search) {
        filters.push(
          or(
            like(properties.address, `%${input.search}%`),
            like(tenants.firstName, `%${input.search}%`),
            like(tenants.lastName, `%${input.search}%`),
            like(tenants.email, `%${input.search}%`)
          )!
        );
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      // Order by: pinned first, then by updated date
      const results = await query.orderBy(
        desc(tenancies.isPinned),
        desc(tenancies.updatedAt)
      );

      // Filter by tags if provided (tags stored as JSON array in text field)
      if (input?.tags && input.tags.length > 0) {
        return results.filter((r) => {
          if (!r.tenancy.tags) return false;
          try {
            const tenancyTags = JSON.parse(r.tenancy.tags);
            return input.tags!.some((tag) => tenancyTags.includes(tag));
          } catch {
            return false;
          }
        });
      }

      return results;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [result] = await db
        .select({
          tenancy: tenancies,
          property: properties,
          tenant: tenants,
        })
        .from(tenancies)
        .leftJoin(properties, eq(tenancies.propertyId, properties.id))
        .leftJoin(tenants, eq(tenancies.tenantId, tenants.id))
        .where(eq(tenancies.id, input.id));

      return result || null;
    }),

  create: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      tenantId: z.number(),
      leaseStartDate: z.date(),
      leaseEndDate: z.date().optional(),
      weeklyRent: z.string(),
      bondAmount: z.string().optional(),
      status: z.enum(['active', 'ending', 'terminated', 'completed']).default('active'),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db
        .insert(tenancies)
        .values({
          propertyId: input.propertyId,
          tenantId: input.tenantId,
          leaseStartDate: input.leaseStartDate,
          leaseEndDate: input.leaseEndDate,
          weeklyRent: input.weeklyRent,
          bondAmount: input.bondAmount,
          status: input.status,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          notes: input.notes,
        });

      return { success: true, id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      leaseStartDate: z.date().optional(),
      leaseEndDate: z.date().optional(),
      weeklyRent: z.string().optional(),
      bondAmount: z.string().optional(),
      status: z.enum(['active', 'ending', 'terminated', 'completed']).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: any = {};
      if (input.leaseStartDate) updateData.leaseStartDate = input.leaseStartDate;
      if (input.leaseEndDate) updateData.leaseEndDate = input.leaseEndDate;
      if (input.weeklyRent) updateData.weeklyRent = input.weeklyRent;
      if (input.bondAmount) updateData.bondAmount = input.bondAmount;
      if (input.status) updateData.status = input.status;
      if (input.tags) updateData.tags = JSON.stringify(input.tags);
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db
        .update(tenancies)
        .set(updateData)
        .where(eq(tenancies.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Delete associated alerts first
      await db
        .delete(tenancyAlerts)
        .where(eq(tenancyAlerts.tenancyId, input.id));

      await db
        .delete(tenancies)
        .where(eq(tenancies.id, input.id));

      return { success: true };
    }),

  toggleFlag: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [tenancy] = await db
        .select()
        .from(tenancies)
        .where(eq(tenancies.id, input.id));

      if (!tenancy) throw new Error('Tenancy not found');

      await db
        .update(tenancies)
        .set({ isFlagged: !tenancy.isFlagged })
        .where(eq(tenancies.id, input.id));

      return { success: true, isFlagged: !tenancy.isFlagged };
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [tenancy] = await db
        .select()
        .from(tenancies)
        .where(eq(tenancies.id, input.id));

      if (!tenancy) throw new Error('Tenancy not found');

      await db
        .update(tenancies)
        .set({ isPinned: !tenancy.isPinned })
        .where(eq(tenancies.id, input.id));

      return { success: true, isPinned: !tenancy.isPinned };
    }),

  // Alert management
  getAllAlerts: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'resolved', 'dismissed', 'all']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).optional(),
      alertType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select({
          alert: tenancyAlerts,
          tenancy: tenancies,
          property: properties,
          tenant: tenants,
        })
        .from(tenancyAlerts)
        .leftJoin(tenancies, eq(tenancyAlerts.tenancyId, tenancies.id))
        .leftJoin(properties, eq(tenancies.propertyId, properties.id))
        .leftJoin(tenants, eq(tenancies.tenantId, tenants.id))
        .$dynamic();

      const filters = [];

      if (input?.status && input.status !== 'all') {
        filters.push(eq(tenancyAlerts.status, input.status));
      }

      if (input?.priority && input.priority !== 'all') {
        filters.push(eq(tenancyAlerts.priority, input.priority));
      }

      if (input?.alertType) {
        filters.push(sql`${tenancyAlerts.alertType} = ${input.alertType}`);
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(
        desc(tenancyAlerts.priority),
        asc(tenancyAlerts.dueDate),
        desc(tenancyAlerts.createdAt)
      );

      return results;
    }),

  getAlerts: protectedProcedure
    .input(z.object({ tenancyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(tenancyAlerts)
        .where(eq(tenancyAlerts.tenancyId, input.tenancyId))
        .orderBy(desc(tenancyAlerts.priority), desc(tenancyAlerts.createdAt));
    }),

  createAlert: protectedProcedure
    .input(z.object({
      tenancyId: z.number(),
      alertType: z.enum(['antisocial_behavior', 'court_hearing', 'complaint', 'terminate', 'rent_arrears', 'breach_notice', 'inspection_due', 'lease_expiry', 'other']),
      title: z.string(),
      description: z.string().optional(),
      dueDate: z.date().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .insert(tenancyAlerts)
        .values({
          tenancyId: input.tenancyId,
          alertType: input.alertType,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          priority: input.priority,
          createdBy: ctx.user.id,
        });

      return { success: true };
    }),

  updateAlert: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      dueDate: z.date().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['active', 'resolved', 'dismissed']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.dueDate) updateData.dueDate = input.dueDate;
      if (input.priority) updateData.priority = input.priority;
      if (input.status) {
        updateData.status = input.status;
        if (input.status === 'resolved') {
          updateData.resolvedBy = ctx.user.id;
          updateData.resolvedAt = new Date();
        }
      }

      await db
        .update(tenancyAlerts)
        .set(updateData)
        .where(eq(tenancyAlerts.id, input.id));

      return { success: true };
    }),

  deleteAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .delete(tenancyAlerts)
        .where(eq(tenancyAlerts.id, input.id));

      return { success: true };
    }),

  // Timeline
  getTimeline: protectedProcedure
    .input(z.object({ tenancyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const events: Array<{
        id: string;
        type: 'lease_start' | 'lease_end' | 'rent_change' | 'alert' | 'communication' | 'maintenance';
        title: string;
        description: string;
        timestamp: Date;
        metadata?: any;
      }> = [];

      // Get tenancy details
      const [tenancy] = await db
        .select()
        .from(tenancies)
        .where(eq(tenancies.id, input.tenancyId));

      if (!tenancy) return [];

      // Add lease start event
      if (tenancy.leaseStartDate) {
        events.push({
          id: `lease-start-${tenancy.id}`,
          type: 'lease_start',
          title: 'Lease Started',
          description: `Tenancy commenced with weekly rent of $${tenancy.weeklyRent}`,
          timestamp: tenancy.leaseStartDate,
          metadata: { weeklyRent: tenancy.weeklyRent, bondAmount: tenancy.bondAmount },
        });
      }

      // Add lease end event if applicable
      if (tenancy.leaseEndDate && tenancy.status === 'completed') {
        events.push({
          id: `lease-end-${tenancy.id}`,
          type: 'lease_end',
          title: 'Lease Ended',
          description: 'Tenancy completed',
          timestamp: tenancy.leaseEndDate,
        });
      }

      // Get all alerts for this tenancy
      const alerts = await db
        .select()
        .from(tenancyAlerts)
        .where(eq(tenancyAlerts.tenancyId, input.tenancyId))
        .orderBy(desc(tenancyAlerts.createdAt));

      for (const alert of alerts) {
        events.push({
          id: `alert-${alert.id}`,
          type: 'alert',
          title: alert.title,
          description: alert.description || `${alert.alertType} alert ${alert.status}`,
          timestamp: alert.createdAt,
          metadata: {
            alertType: alert.alertType,
            priority: alert.priority,
            status: alert.status,
            resolvedAt: alert.resolvedAt,
          },
        });
      }

      // Sort all events by timestamp (most recent first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return events;
    }),

  // CSV Export
  exportCSV: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { data: [] };

      const results = await db
        .select({
          tenancy: tenancies,
          property: properties,
          tenant: tenants,
        })
        .from(tenancies)
        .leftJoin(properties, eq(tenancies.propertyId, properties.id))
        .leftJoin(tenants, eq(tenancies.tenantId, tenants.id))
        .orderBy(desc(tenancies.isPinned), desc(tenancies.updatedAt));

      const data = results.map((r) => ({
        id: r.tenancy.id,
        property: r.property?.address || '',
        tenant: `${r.tenant?.firstName || ''} ${r.tenant?.lastName || ''}`.trim(),
        email: r.tenant?.email || '',
        phone: r.tenant?.phone || '',
        leaseStart: r.tenancy.leaseStartDate?.toISOString().split('T')[0] || '',
        leaseEnd: r.tenancy.leaseEndDate?.toISOString().split('T')[0] || '',
        weeklyRent: r.tenancy.weeklyRent || '',
        bondAmount: r.tenancy.bondAmount || '',
        status: r.tenancy.status,
        tags: r.tenancy.tags || '',
        flagged: r.tenancy.isFlagged ? 'Yes' : 'No',
        pinned: r.tenancy.isPinned ? 'Yes' : 'No',
        notes: r.tenancy.notes || '',
      }));

      return { data };
    }),
});
