import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { tagsRouter } from "./routers/tags";
import { approvalsRouter } from "./routers/approvals";
import { templatesRouter } from "./routers/templates";
import { tenanciesRouter } from "./routers/tenancies";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { palaceSyncService } from "./palace-sync";
import { communicationsService } from "./communications-service";
import { csvRouter } from "./routers/csv";
import { ArrearsService } from './arrears-service';
import { MaintenanceService } from './maintenance-service';
import { rentArrears, tenants, properties } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { nanoid } from "nanoid";

export const appRouter = router({
  tags: tagsRouter,
  system: systemRouter,
  csv: csvRouter,
  approvals: approvalsRouter,
  templates: templatesRouter,
  tenancies: tenanciesRouter,
  
  maintenance: router({
    pendingApprovals: protectedProcedure.query(() => MaintenanceService.getPendingApprovals()),
    approve: protectedProcedure
      .input(z.object({ id: z.number(), approvedBy: z.number() }))
      .mutation(({ input }) => MaintenanceService.approve(input.id, input.approvedBy)),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), rejectedBy: z.number(), reason: z.string() }))
      .mutation(({ input }) => MaintenanceService.reject(input.id, input.rejectedBy, input.reason)),
    getCostSummary: protectedProcedure
      .input(z.object({
        propertyId: z.number().optional(),
        tenancyId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.enum(['plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'landscaping', 'pest_control', 'cleaning', 'other']).optional(),
      }).optional())
      .query(async ({ input }) => MaintenanceService.getCostSummary(input)),
  }),
  
  arrears: router({
    checkOverdue: protectedProcedure.query(() => ArrearsService.checkOverdueArrears()),
    generateLetter: protectedProcedure
      .input(z.object({ arrearsId: z.number(), tenantId: z.number(), propertyId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { letter: '' };
        const arrearsData = await db.select().from(rentArrears).where(eq(rentArrears.id, input.arrearsId)).limit(1);
        const tenant = await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
        const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        const letter = await ArrearsService.generateBreachLetter({ arrears: arrearsData[0], tenant: tenant[0], property: property[0] });
        return { letter };
      }),
    getDailySummary: protectedProcedure.query(() => ArrearsService.getDailySummary()),
  }),
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // Properties
  // ============================================================================
  properties: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProperties();
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPropertyById(input.id);
      }),

    byStatus: protectedProcedure
      .input(z.object({ status: z.enum(['vacant', 'occupied', 'maintenance', 'advertising']) }))
      .query(async ({ input }) => {
        return await db.getPropertiesByStatus(input.status);
      }),

    create: protectedProcedure
      .input(z.object({
        address: z.string(),
        suburb: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
        propertyType: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        parkingSpaces: z.number().optional(),
        weeklyRent: z.string().optional(),
        status: z.enum(['vacant', 'occupied', 'maintenance', 'advertising']),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.upsertProperty({
          ...input,
          managerId: ctx.user.id,
        });
      }),
  }),

  // ============================================================================
  // Tenants
  // ============================================================================
  tenants: router({
    list: protectedProcedure.query(async () => {
      return await db.getActiveTenants();
    }),

    byProperty: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTenantsByPropertyId(input.propertyId);
      }),
  }),

  // ============================================================================
  // Tickets
  // ============================================================================
  tickets: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTickets();
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const ticket = await db.getTicketById(input.id);
        if (!ticket) return null;

        const activities = await db.getTicketActivities(input.id);
        const communications = await db.getCommunicationsByTicketId(input.id);

        return {
          ticket,
          activities,
          communications,
        };
      }),

    byStatus: protectedProcedure
      .input(z.object({ status: z.enum(['new', 'open', 'pending', 'in_progress', 'awaiting_approval', 'approved', 'sent', 'resolved', 'closed']) }))
      .query(async ({ input }) => {
        return await db.getTicketsByStatus(input.status);
      }),

    myTickets: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTicketsByAssignee(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        type: z.enum(['inquiry', 'maintenance', 'complaint', 'arrears', 'viewing', 'application', 'other']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        subject: z.string(),
        description: z.string().optional(),
        tenantId: z.number().optional(),
        propertyId: z.number().optional(),
        assignedTo: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ticketNumber = `TKT-${nanoid(8).toUpperCase()}`;
        
        const result = await db.createTicket({
          ticketNumber,
          type: input.type,
          status: 'open',
          priority: input.priority || 'medium',
          subject: input.subject,
          description: input.description,
          tenantId: input.tenantId,
          propertyId: input.propertyId,
          assignedTo: input.assignedTo,
          createdBy: ctx.user.id,
        });

        // Log activity
        await db.createTicketActivity({
          ticketId: result[0].insertId,
          userId: ctx.user.id,
          activityType: 'created',
          description: `Ticket created by ${ctx.user.name || ctx.user.email}`,
        });

        return result;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['new', 'open', 'pending', 'in_progress', 'awaiting_approval', 'approved', 'sent', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignedTo: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        
        const result = await db.updateTicket(id, updates);

        // Log activity
        const changes = Object.entries(updates)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');

        await db.createTicketActivity({
          ticketId: id,
          userId: ctx.user.id,
          activityType: 'updated',
          description: `Ticket updated: ${changes}`,
        });

        return result;
      }),

    assign: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateTicket(input.ticketId, {
          assignedTo: input.userId,
        });

        await db.createTicketActivity({
          ticketId: input.ticketId,
          userId: ctx.user.id,
          activityType: 'assigned',
          description: `Ticket assigned to user ${input.userId}`,
        });

        return { success: true };
      }),

    addComment: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        comment: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createTicketActivity({
          ticketId: input.ticketId,
          userId: ctx.user.id,
          activityType: 'commented',
          description: input.comment,
        });

        return { success: true };
      }),
  }),

  // ============================================================================
  // Communications
  // ============================================================================
  communications: router({
    recent: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getRecentCommunications(input.limit || 50);
      }),

    byTicket: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommunicationsByTicketId(input.ticketId);
      }),

    byTenant: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommunicationsByTenantId(input.tenantId);
      }),

    sendEmail: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input }) => {
        await communicationsService.initialize();
        return await communicationsService.sendEmail(input.to, input.subject, input.body);
      }),

    sendSMS: protectedProcedure
      .input(z.object({
        to: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input }) => {
        await communicationsService.initialize();
        return await communicationsService.sendSMS(input.to, input.body);
      }),

    sendWhatsApp: protectedProcedure
      .input(z.object({
        to: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input }) => {
        await communicationsService.initialize();
        return await communicationsService.sendWhatsApp(input.to, input.body);
      }),
  }),

  // ============================================================================
  // Rent Arrears
  // ============================================================================
  rentArrears: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllRentArrears();
    }),

    requiresAction: protectedProcedure
      .input(z.object({ minDaysOverdue: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getArrearsRequiringAction(input.minDaysOverdue || 10);
      }),
  }),

  // Maintenance router moved to line 21 - old methods removed

  // ============================================================================
  // Viewings
  // ============================================================================
  viewings: router({
    list: protectedProcedure.query(async () => {
      return await db.getPendingViewings();
    }),

    byProperty: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getViewingsByPropertyId(input.propertyId);
      }),

    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        prospectName: z.string(),
        prospectEmail: z.string().email().optional(),
        prospectPhone: z.string().optional(),
        scheduledDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        return await db.createViewing({
          ...input,
          status: 'pending_approval',
        });
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.updateViewing(input.id, {
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
      }),
  }),

  // ============================================================================
  // Calendar Slots
  // ============================================================================
  calendar: router({
    availableSlots: protectedProcedure
      .input(z.object({
        slotType: z.enum(['viewing', 'maintenance', 'inspection']),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getAvailableSlots(input.slotType, input.startDate, input.endDate);
      }),

    createSlot: protectedProcedure
      .input(z.object({
        slotType: z.enum(['viewing', 'maintenance', 'inspection']),
        startTime: z.date(),
        endTime: z.date(),
        propertyId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createCalendarSlot({
          ...input,
          available: true,
          allocatedBy: ctx.user.id,
        });
      }),
  }),

  // ============================================================================
  // Notifications
  // ============================================================================
  notifications: router({
    unread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.markNotificationAsRead(input.id);
      }),
  }),

  // ============================================================================
  // Palace.com Integration
  // ============================================================================
  palace: router({
    syncNow: protectedProcedure.mutation(async () => {
      return await palaceSyncService.syncAll();
    }),

    syncStatus: protectedProcedure.query(async () => {
      return await db.getIntegrationSetting('palace');
    }),
  }),

  // ============================================================================
  // Integration Settings
  // ============================================================================
  integrations: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllIntegrationSettings();
    }),

    configure: protectedProcedure
      .input(z.object({
        service: z.enum(['palace', 'outlook', 'vonage', 'slack', 'n8n', 'claude', 'chatgpt', 'gemini']),
        enabled: z.boolean(),
        configData: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertIntegrationSetting(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
