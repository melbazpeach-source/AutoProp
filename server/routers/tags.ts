import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { categories, tags, propertyTags, maintenanceTags, tenantTags } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const tagsRouter = router({
  // Categories
  listCategories: protectedProcedure
    .input(z.object({ type: z.enum(['property', 'maintenance', 'tenant', 'general']).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(categories);
      if (input.type) {
        query = query.where(eq(categories.type, input.type)) as any;
      }
      return await query;
    }),

  createCategory: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(['property', 'maintenance', 'tenant', 'general']),
      color: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.insert(categories).values(input);
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),

  // Tags
  listTags: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(tags);
  }),

  createTag: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.insert(tags).values(input);
      return { success: true };
    }),

  deleteTag: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.delete(tags).where(eq(tags.id, input.id));
      return { success: true };
    }),

  // Assign tags
  assignPropertyTag: protectedProcedure
    .input(z.object({ propertyId: z.number(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.insert(propertyTags).values(input);
      return { success: true };
    }),

  assignMaintenanceTag: protectedProcedure
    .input(z.object({ maintenanceRequestId: z.number(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.insert(maintenanceTags).values(input);
      return { success: true };
    }),

  assignTenantTag: protectedProcedure
    .input(z.object({ tenantId: z.number(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.insert(tenantTags).values(input);
      return { success: true };
    }),
});
