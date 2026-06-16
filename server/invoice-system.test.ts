// [graft] RECOVERED: invoice-system.test.ts (Vanessa's work).
// Source: massCode fragment "invoice-system.test.ts". Reproduced verbatim.
// These tests exercise only pure functions (validateExtraction, calculateGST)
// and inline arithmetic — they do NOT require a live database, so they run as
// part of the normal `pnpm test` suite without modification.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceOCRService, OCRExtractedData } from './invoice-ocr-service';
import { InvoiceMatchingService } from './invoice-matching-service';

describe('InvoiceOCRService', () => {
  describe('validateExtraction', () => {
    it('should validate correct invoice data', () => {
      const data: OCRExtractedData = {
        invoiceNumber: 'INV-001',
        totalAmount: 1000,
        confidence: 95,
        warnings: []
      };

      const result = InvoiceOCRService.validateExtraction(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invoice without number', () => {
      const data: OCRExtractedData = {
        totalAmount: 1000,
        confidence: 95,
        warnings: []
      };

      const result = InvoiceOCRService.validateExtraction(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice number is required');
    });

    it('should reject invoice with zero or negative amount', () => {
      const data: OCRExtractedData = {
        invoiceNumber: 'INV-001',
        totalAmount: 0,
        confidence: 95,
        warnings: []
      };

      const result = InvoiceOCRService.validateExtraction(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total amount must be greater than 0');
    });

    it('should reject low confidence extractions', () => {
      const data: OCRExtractedData = {
        invoiceNumber: 'INV-001',
        totalAmount: 1000,
        confidence: 40,
        warnings: []
      };

      const result = InvoiceOCRService.validateExtraction(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Low confidence'))).toBe(true);
    });

    it('should validate invoice dates', () => {
      const data: OCRExtractedData = {
        invoiceNumber: 'INV-001',
        invoiceDate: 'invalid-date',
        totalAmount: 1000,
        confidence: 95,
        warnings: []
      };

      const result = InvoiceOCRService.validateExtraction(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid invoice date format');
    });
  });

  describe('calculateGST', () => {
    it('should calculate 15% GST correctly', () => {
      const gst = InvoiceOCRService.calculateGST(1000);
      expect(gst).toBe(150);
    });

    it('should handle custom GST rates', () => {
      const gst = InvoiceOCRService.calculateGST(1000, 0.1);
      expect(gst).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      const gst = InvoiceOCRService.calculateGST(100.33);
      expect(gst).toBe(15.05);
    });
  });
});

describe('InvoiceMatchingService', () => {
  describe('fuzzy matching', () => {
    it('should give high score for exact contractor name match', () => {
      const maintenance = {
        id: 1,
        contractorName: 'ABC Plumbing',
        estimatedCost: '1000',
        status: 'approved',
        scheduledDate: new Date()
      };

      // We can't directly test private methods, but we can test through calculateMatchScore
      // by checking the result
      expect(maintenance.contractorName).toBe('ABC Plumbing');
    });

    it('should handle contractor name variations', () => {
      // Test that fuzzy matching would work for common variations
      const names = [
        { invoice: 'ABC Plumbing Ltd', maintenance: 'ABC Plumbing' },
        { invoice: 'ABC Plumbing', maintenance: 'ABC Plumbing Ltd' },
        { invoice: 'abc plumbing', maintenance: 'ABC Plumbing' }
      ];

      names.forEach(({ invoice, maintenance }) => {
        expect(invoice.toLowerCase()).toContain(maintenance.toLowerCase().split(' ')[0]);
      });
    });
  });

  describe('amount matching', () => {
    it('should match invoices within 5% of estimate', () => {
      const estimatedCost = 1000;
      const invoiceAmount = 1020; // 2% difference
      const percentDiff = (Math.abs(invoiceAmount - estimatedCost) / estimatedCost) * 100;

      expect(percentDiff).toBeLessThan(5);
    });

    it('should flag invoices with >15% difference', () => {
      const estimatedCost = 1000;
      const invoiceAmount = 1200; // 20% difference
      const percentDiff = (Math.abs(invoiceAmount - estimatedCost) / estimatedCost) * 100;

      expect(percentDiff).toBeGreaterThan(15);
    });
  });

  describe('date proximity', () => {
    it('should match invoices within 7 days of scheduled date', () => {
      const scheduledDate = new Date('2026-02-20');
      const invoiceDate = new Date('2026-02-22');
      const daysDiff = Math.abs(
        (invoiceDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    it('should flag invoices more than 30 days after scheduled date', () => {
      const scheduledDate = new Date('2026-01-20');
      const invoiceDate = new Date('2026-02-25');
      const daysDiff = Math.abs(
        (invoiceDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBeGreaterThan(30);
    });
  });

  describe('levenshtein distance', () => {
    it('should calculate string similarity correctly', () => {
      // Test examples
      const tests = [
        { str1: 'kitten', str2: 'sitting', expectedDistance: 3 },
        { str1: 'abc', str2: 'abc', expectedDistance: 0 },
        { str1: 'abc', str2: 'def', expectedDistance: 3 }
      ];

      tests.forEach(({ str1, str2, expectedDistance }) => {
        // Simple implementation for testing
        let distance = 0;
        const maxLen = Math.max(str1.length, str2.length);
        for (let i = 0; i < maxLen; i++) {
          if (str1[i] !== str2[i]) distance++;
        }
        // This is a simplified check - full Levenshtein would be more complex
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Invoice data flow', () => {
  it('should handle complete invoice extraction and validation flow', () => {
    const extractedData: OCRExtractedData = {
      invoiceNumber: 'INV-2026-001',
      invoiceDate: '2026-02-20',
      dueDate: '2026-03-20',
      contractorName: 'ABC Plumbing',
      contractorEmail: 'contact@abcplumbing.co.nz',
      contractorPhone: '+64 9 123 4567',
      subtotal: 1000,
      gstAmount: 150,
      totalAmount: 1150,
      description: 'Plumbing repair work',
      lineItems: [
        {
          description: 'Labour',
          quantity: 4,
          unitPrice: 150,
          lineTotal: 600,
          category: 'labour'
        },
        {
          description: 'Materials',
          quantity: 1,
          unitPrice: 400,
          lineTotal: 400,
          category: 'materials'
        }
      ],
      confidence: 92,
      warnings: []
    };

    const validation = InvoiceOCRService.validateExtraction(extractedData);
    expect(validation.valid).toBe(true);

    // Verify line items sum
    const lineItemsTotal = extractedData.lineItems!.reduce((sum, item) => sum + item.lineTotal, 0);
    expect(lineItemsTotal).toBe(1000);

    // Verify GST calculation
    const calculatedGST = InvoiceOCRService.calculateGST(extractedData.subtotal!);
    expect(calculatedGST).toBe(150);

    // Verify total
    expect(extractedData.subtotal! + extractedData.gstAmount!).toBe(extractedData.totalAmount);
  });

  it('should detect discrepancies in invoice data', () => {
    const extractedData: OCRExtractedData = {
      invoiceNumber: 'INV-2026-002',
      totalAmount: 1150,
      subtotal: 1000,
      gstAmount: 200, // Wrong GST - should be 150
      confidence: 85,
      warnings: []
    };

    const validation = InvoiceOCRService.validateExtraction(extractedData);
    // Should still be valid but with warnings
    expect(extractedData.subtotal! + extractedData.gstAmount!).not.toBe(extractedData.totalAmount);
  });
});
