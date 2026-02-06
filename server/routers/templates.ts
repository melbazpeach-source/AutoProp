import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { emailTemplates } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const templatesRouter = router({
  list: protectedProcedure
    .input(z.object({
      category: z.enum(['rent_reminder', 'maintenance', 'viewing', 'breach_letter', 'general']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(emailTemplates);
      
      if (input?.category) {
        query = query.where(eq(emailTemplates.category, input.category)) as any;
      }
      
      return await query;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.id));
      
      return template || null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      category: z.enum(['rent_reminder', 'maintenance', 'viewing', 'breach_letter', 'general']),
      subject: z.string(),
      body: z.string(),
      variables: z.string().optional(), // JSON string
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [template] = await db
        .insert(emailTemplates)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .$returningId();
      
      return { id: template.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      category: z.enum(['rent_reminder', 'maintenance', 'viewing', 'breach_letter', 'general']).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      variables: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const { id, ...updates } = input;
      
      await db
        .update(emailTemplates)
        .set(updates)
        .where(eq(emailTemplates.id, id));
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, input.id));
      
      return { success: true };
    }),

  // Apply template to create a new communication draft
  applyTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      variables: z.record(z.string(), z.string()), // key-value pairs for variable substitution
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.templateId));
      
      if (!template) throw new Error('Template not found');
      
      // Replace variables in subject and body
      let subject = template.subject;
      let body = template.body;
      
      Object.entries(input.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      });
      
      return {
        subject,
        body,
        category: template.category,
      };
    }),
});
