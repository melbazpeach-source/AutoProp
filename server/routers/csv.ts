import { protectedProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { CSVService } from '../csv-service';
import { getDb } from '../db';
import { rentArrears, maintenanceRequests, tenants } from '../../drizzle/schema';

export const csvRouter = router({
  importRentArrears: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ input }) => {
      const result = CSVService.importRentArrears(input.csvContent);
      if (!result.success || !result.data) return { success: false, errors: result.errors };
      
      const db = await getDb();
      if (!db) throw new Error('Database unavailable');
      
      let success = 0, failed = 0;
      for (const r of result.data) {
        try {
          await db.insert(rentArrears).values({
            tenantId: parseInt(r.tenantId),
            propertyId: parseInt(r.propertyId),
            amountOwed: r.amountOwed.toString(),
            daysOverdue: r.daysOverdue,
            lastPaymentDate: new Date(r.lastPaymentDate),
            paymentArrangementBroken: r.arrangementBroken === 'TRUE',
            notes: r.notes || null,
          });
          success++;
        } catch { failed++; }
      }
      return { success: true, summary: { totalRows: result.data.length, successfulRows: success, failedRows: failed } };
    }),

  importMaintenance: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ input }) => {
      const result = CSVService.importMaintenance(input.csvContent);
      if (!result.success || !result.data) return { success: false, errors: result.errors };
      
      const db = await getDb();
      if (!db) throw new Error('Database unavailable');
      
      let success = 0, failed = 0;
      for (const r of result.data) {
        try {
          await db.insert(maintenanceRequests).values({
            propertyId: parseInt(r.propertyId),
            tenantId: null,
            title: r.description.substring(0, 255),
            description: r.description,
            category: r.category.toLowerCase() as any,
            urgency: 'routine' as any,
            estimatedCost: r.estimatedCost.toString(),
            status: 'draft' as any,
            notes: r.notes || null,
          });
          success++;
        } catch { failed++; }
      }
      return { success: true, summary: { totalRows: result.data.length, successfulRows: success, failedRows: failed } };
    }),

  importTenants: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ input }) => {
      const result = CSVService.importTenants(input.csvContent);
      if (!result.success || !result.data) return { success: false, errors: result.errors };
      
      const db = await getDb();
      if (!db) throw new Error('Database unavailable');
      
      let success = 0, failed = 0;
      for (const r of result.data) {
        try {
          await db.insert(tenants).values({
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            phone: r.phone,
            mobilePhone: r.phone,
            leaseStartDate: new Date(r.leaseStartDate),
            leaseEndDate: new Date(r.leaseEndDate),
            status: 'active',
          });
          success++;
        } catch { failed++; }
      }
      return { success: true, summary: { totalRows: result.data.length, successfulRows: success, failedRows: failed } };
    }),

  getTemplate: protectedProcedure
    .input(z.enum(['rent-arrears', 'maintenance', 'tenants']))
    .query(({ input }) => ({
      template: CSVService.generateTemplate(input),
      example: CSVService.generateExampleData(input),
    })),
});
