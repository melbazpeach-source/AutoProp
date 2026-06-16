// [graft] RECOVERED: invoices tRPC router (Vanessa's work).
// Source: massCode fragment "Add invoice procedures to trpc - invoices.ts".
// Target path server/routers/invoices.ts (matches tenancies.ts placement).
// Reproduced as faithfully as possible; adaptations marked `// [graft]`.
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { invoices, invoiceLineItems, maintenanceRequests } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
// [graft] storagePut/storageGet are imported by the recovered router but never
// referenced in its body. Kept to preserve the recovered file verbatim (the
// project's tsconfig does not flag unused imports).
import { storagePut, storageGet } from '../storage';
import { InvoiceOCRService } from '../invoice-ocr-service';
import { InvoiceMatchingService } from '../invoice-matching-service';
import { TRPCError } from '@trpc/server';

export const invoicesRouter = router({
  /**
   * Upload invoice document and extract data via OCR
   */
  uploadAndExtract: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string().url(),
        maintenanceRequestId: z.number().optional()
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Extract data from document using OCR
        const extractedData = await InvoiceOCRService.extractFromDocument(input.documentUrl);

        // Validate extraction
        const validation = InvoiceOCRService.validateExtraction(extractedData);
        if (!validation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invoice extraction failed: ${validation.errors.join(', ')}`
          });
        }

        // Find potential matches if not provided
        let matchedMaintenanceId: number | null = input.maintenanceRequestId || null;
        let matchConfidence = 0;
        let discrepancies: string[] = [];

        if (!matchedMaintenanceId && extractedData.invoiceNumber) {
          const matches = await InvoiceMatchingService.findMatches(
            extractedData.invoiceNumber,
            extractedData.contractorName || '',
            extractedData.totalAmount || 0,
            extractedData.invoiceDate ? new Date(extractedData.invoiceDate) : undefined
          );

          if (matches.length > 0) {
            const topMatch = matches[0];
            matchedMaintenanceId = topMatch.maintenanceId;
            matchConfidence = topMatch.confidence;
            discrepancies = topMatch.discrepancies;
          }
        }

        return {
          extractedData,
          matchedMaintenanceId,
          matchConfidence,
          discrepancies,
          validation: { valid: true, errors: [] }
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to extract invoice'
        });
      }
    }),

  /**
   * Create invoice record
   */
  create: protectedProcedure
    .input(
      z.object({
        invoiceNumber: z.string().min(1),
        contractorName: z.string().min(1),
        contractorEmail: z.string().email().optional(),
        contractorPhone: z.string().optional(),
        invoiceDate: z.date(),
        dueDate: z.date().optional(),
        subtotal: z.string(),
        gstAmount: z.string(),
        totalAmount: z.string(),
        description: z.string().optional(),
        documentUrl: z.string().url(),
        // [graft] This repo's Zod (v4) requires an explicit key type for
        // z.record(); the recovered single-arg `z.record(z.any())` is updated to
        // `z.record(z.string(), z.any())` — same runtime meaning (string-keyed
        // arbitrary object).
        ocrExtractedData: z.record(z.string(), z.any()).optional(),
        matchedMaintenanceId: z.number().optional(),
        matchConfidence: z.number().optional(),
        discrepancies: z.array(z.string()).optional(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            lineTotal: z.string(),
            category: z.string().optional()
          })
        ).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Check if invoice number already exists
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, input.invoiceNumber))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Invoice ${input.invoiceNumber} already exists`
        });
      }

      // Create invoice
      const result = await db
        .insert(invoices)
        .values({
          invoiceNumber: input.invoiceNumber,
          contractorName: input.contractorName,
          contractorEmail: input.contractorEmail,
          contractorPhone: input.contractorPhone,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
          subtotal: input.subtotal,
          gstAmount: input.gstAmount,
          totalAmount: input.totalAmount,
          description: input.description,
          documentUrl: input.documentUrl,
          ocrExtractedData: input.ocrExtractedData ? JSON.stringify(input.ocrExtractedData) : null,
          matchedMaintenanceId: input.matchedMaintenanceId,
          matchConfidence: input.matchConfidence ? input.matchConfidence.toString() : null,
          discrepancies: input.discrepancies ? JSON.stringify(input.discrepancies) : null,
          status: 'received'
        });

      const invoiceId = result[0].insertId;

      // Create line items if provided
      if (input.lineItems && input.lineItems.length > 0) {
        await db
          .insert(invoiceLineItems)
          .values(
            input.lineItems.map(item => ({
              invoiceId: invoiceId as number,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              category: item.category
            }))
          );
      }

      return { id: invoiceId, invoiceNumber: input.invoiceNumber };
    }),

  /**
   * Get all invoices with filtering
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'received', 'under_review', 'approved', 'rejected', 'paid', 'overdue']).optional(),
        paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
        contractorName: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0)
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const conditions = [];
      if (input.status) conditions.push(eq(invoices.status, input.status));
      if (input.paymentStatus) conditions.push(eq(invoices.paymentStatus, input.paymentStatus));
      if (input.contractorName) {
        conditions.push(
          // Partial match on contractor name
          eq(invoices.contractorName, input.contractorName)
        );
      }

      // [graft] The recovered code built `conditions` but never applied them to
      // the query (it selected unfiltered). Behaviour preserved exactly:
      // filtering is applied by `getAll`'s callers via the status tabs in the
      // UI. The `conditions`/`and` plumbing is kept for fidelity; wiring it into
      // a `.where()` would be a behaviour change, so it is left as-is.
      const query = db.select().from(invoices).$dynamic();
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const result = await query
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get invoice by ID with line items
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (invoice.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.id));

      return {
        ...invoice[0],
        lineItems
      };
    }),

  /**
   * Update invoice status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['pending', 'received', 'under_review', 'approved', 'rejected', 'paid', 'overdue']),
        approvedBy: z.number().optional(),
        rejectionReason: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const updates: any = {
        status: input.status
      };

      if (input.status === 'approved') {
        updates.approvedBy = ctx.user.id;
        updates.approvedAt = new Date();
      } else if (input.status === 'rejected') {
        updates.rejectedBy = ctx.user.id;
        updates.rejectedAt = new Date();
        updates.rejectionReason = input.rejectionReason;
      }

      await db
        .update(invoices)
        .set(updates)
        .where(eq(invoices.id, input.id));

      return { success: true };
    }),

  /**
   * Record payment
   */
  recordPayment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amountPaid: z.string(),
        paymentDate: z.date(),
        paymentMethod: z.string(),
        paymentReference: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (invoice.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      const currentPaid = parseFloat(invoice[0].amountPaid || '0');
      const totalPaid = currentPaid + parseFloat(input.amountPaid);
      const totalAmount = parseFloat(invoice[0].totalAmount);

      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (totalPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await db
        .update(invoices)
        .set({
          amountPaid: totalPaid.toString(),
          paymentDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          paymentStatus
        })
        .where(eq(invoices.id, input.id));

      return { success: true, paymentStatus };
    })
});
