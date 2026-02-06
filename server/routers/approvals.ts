import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { communications } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { CommunicationsService } from '../communications-service';

export const approvalsRouter = router({
  getPending: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    return await db
      .select()
      .from(communications)
      .where(eq(communications.status, 'pending_approval'));
  }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [comm] = await db
        .select()
        .from(communications)
        .where(eq(communications.id, input.id));
      
      if (!comm) throw new Error('Communication not found');
      
      // Update to approved
      await db
        .update(communications)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        })
        .where(eq(communications.id, input.id));
      
      // Send via appropriate channel
      try {
        const commService = new CommunicationsService();
        await commService.initialize();
        
        if (comm.channel === 'email') {
          await commService.sendEmail(
            comm.toAddress!,
            comm.subject || '',
            comm.body || ''
          );
        } else if (comm.channel === 'sms') {
          await commService.sendSMS(
            comm.toAddress!,
            comm.body || ''
          );
        }
        
        // Mark as sent
        await db
          .update(communications)
          .set({
            status: 'sent',
            sentAt: new Date(),
          })
          .where(eq(communications.id, input.id));
        
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Failed to send email' };
      }
    }),

  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .update(communications)
        .set({
          status: 'cancelled',
        })
        .where(eq(communications.id, input.id));
      
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      subject: z.string().optional(),
      body: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .update(communications)
        .set({
          subject: input.subject,
          body: input.body,
          updatedAt: new Date(),
        })
        .where(eq(communications.id, input.id));
      
      return { success: true };
    }),

  bulkApprove: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const commService = new CommunicationsService();
      await commService.initialize();
      
      let successCount = 0;
      let failCount = 0;
      
      for (const id of input.ids) {
        try {
          const [comm] = await db
            .select()
            .from(communications)
            .where(eq(communications.id, id));
          
          if (!comm) continue;
          
          // Update to approved
          await db
            .update(communications)
            .set({
              status: 'approved',
              approvedBy: ctx.user.id,
              approvedAt: new Date(),
            })
            .where(eq(communications.id, id));
          
          // Send via appropriate channel
          if (comm.channel === 'email') {
            await commService.sendEmail(
              comm.toAddress!,
              comm.subject || '',
              comm.body || ''
            );
          } else if (comm.channel === 'sms') {
            await commService.sendSMS(
              comm.toAddress!,
              comm.body || ''
            );
          }
          
          // Mark as sent
          await db
            .update(communications)
            .set({
              status: 'sent',
              sentAt: new Date(),
            })
            .where(eq(communications.id, id));
          
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to approve communication ${id}:`, error);
        }
      }
      
      return { successCount, failCount };
    }),

  bulkReject: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      reason: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      let successCount = 0;
      
      for (const id of input.ids) {
        try {
          await db
            .update(communications)
            .set({
              status: 'cancelled',
            })
            .where(eq(communications.id, id));
          
          successCount++;
        } catch (error) {
          console.error(`Failed to reject communication ${id}:`, error);
        }
      }
      
      return { successCount };
    }),

  schedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledFor: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [comm] = await db
        .select()
        .from(communications)
        .where(eq(communications.id, input.id));
      
      if (!comm) throw new Error('Communication not found');
      
      // Update to scheduled
      await db
        .update(communications)
        .set({
          status: 'scheduled',
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          scheduledFor: input.scheduledFor,
        })
        .where(eq(communications.id, input.id));
      
      return { success: true };
    }),

  getScheduled: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    return await db
      .select()
      .from(communications)
      .where(eq(communications.status, 'scheduled'));
  }),

  cancelScheduled: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .update(communications)
        .set({ status: 'cancelled' })
        .where(eq(communications.id, input.id));
      
      return { success: true };
    }),

  reschedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledFor: z.date(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .update(communications)
        .set({ scheduledFor: input.scheduledFor })
        .where(eq(communications.id, input.id));
      
      return { success: true };
    }),

  create: protectedProcedure
    .input(z.object({
      channel: z.enum(['email', 'sms', 'whatsapp']),
      toAddress: z.string(),
      subject: z.string().optional(),
      body: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .insert(communications)
        .values({
          channel: input.channel,
          direction: 'outbound',
          toAddress: input.toAddress,
          subject: input.subject,
          body: input.body,
          status: 'pending_approval',
          createdAt: new Date(),
        });
      
      return { success: true };
    }),
});
