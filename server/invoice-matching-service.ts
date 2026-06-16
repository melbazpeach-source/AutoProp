// [graft] RECOVERED: invoice-matching-service.ts (Vanessa's work).
// Source: massCode fragment "invoice-matching-service.ts". Reproduced verbatim;
// the only adaptation is marked with `// [graft]` below.
import { getDb } from './db';
import { invoices, maintenanceRequests } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export interface MatchResult {
  maintenanceId: number;
  confidence: number; // 0-100
  reasons: string[];
  discrepancies: string[];
}

export class InvoiceMatchingService {
  /**
   * Find potential maintenance request matches for an invoice
   */
  static async findMatches(
    invoiceNumber: string,
    contractorName: string,
    totalAmount: number,
    invoiceDate?: Date
  ): Promise<MatchResult[]> {
    const db = await getDb();
    if (!db) return [];

    const matches: MatchResult[] = [];

    // Get all pending/approved maintenance requests
    // [graft] The recovered code called `.where(and(/* comments only */))` with
    // no conditions. drizzle's `and()` with zero predicates is fine at runtime
    // but `and` is then unused-by-value; the original intent (TODO in the
    // recovered comments) was to filter to approved/in-progress only. Preserved
    // faithfully as an unfiltered select so behaviour is unchanged; the empty
    // `and(...)` wrapper is dropped because it added no condition.
    const maintenanceList = await db
      .select()
      .from(maintenanceRequests);

    for (const maintenance of maintenanceList) {
      const result = this.calculateMatchScore(
        invoiceNumber,
        contractorName,
        totalAmount,
        invoiceDate,
        maintenance
      );

      if (result.confidence > 30) {
        matches.push(result);
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match confidence between invoice and maintenance request
   */
  private static calculateMatchScore(
    invoiceNumber: string,
    contractorName: string,
    totalAmount: number,
    invoiceDate: Date | undefined,
    maintenance: any
  ): MatchResult {
    const reasons: string[] = [];
    const discrepancies: string[] = [];
    let confidence = 0;

    // Check contractor name match
    if (maintenance.contractorName) {
      const nameMatch = this.fuzzyMatch(
        contractorName.toLowerCase(),
        maintenance.contractorName.toLowerCase()
      );
      if (nameMatch > 0.8) {
        confidence += 40;
        reasons.push(`Contractor name match: ${contractorName}`);
      } else if (nameMatch > 0.5) {
        confidence += 15;
        reasons.push(`Partial contractor name match`);
        discrepancies.push(`Contractor name differs: invoice="${contractorName}" vs maintenance="${maintenance.contractorName}"`);
      }
    }

    // Check amount match
    if (maintenance.estimatedCost) {
      const estimatedNum = parseFloat(maintenance.estimatedCost);
      const amountDiff = Math.abs(totalAmount - estimatedNum);
      const percentDiff = (amountDiff / estimatedNum) * 100;

      if (percentDiff < 5) {
        confidence += 35;
        reasons.push(`Amount matches estimated cost: $${estimatedNum}`);
      } else if (percentDiff < 15) {
        confidence += 15;
        reasons.push(`Amount close to estimated cost`);
        discrepancies.push(`Amount difference: ${percentDiff.toFixed(1)}% (invoice=$${totalAmount} vs estimate=$${estimatedNum})`);
      } else {
        discrepancies.push(`Amount mismatch: ${percentDiff.toFixed(1)}% difference (invoice=$${totalAmount} vs estimate=$${estimatedNum})`);
      }
    }

    // Check date proximity
    if (invoiceDate && maintenance.scheduledDate) {
      const scheduledDate = new Date(maintenance.scheduledDate);
      const daysDiff = Math.abs(
        (invoiceDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 7) {
        confidence += 15;
        reasons.push(`Invoice date close to scheduled date (${daysDiff.toFixed(0)} days)`);
      } else if (daysDiff <= 30) {
        confidence += 5;
        reasons.push(`Invoice date within 30 days of scheduled date`);
        discrepancies.push(`Date difference: ${daysDiff.toFixed(0)} days`);
      } else {
        discrepancies.push(`Date difference: ${daysDiff.toFixed(0)} days (more than 30 days)`);
      }
    }

    // Check if maintenance already has an invoice
    if (maintenance.actualCost) {
      discrepancies.push(`Maintenance request already has actual cost recorded: $${maintenance.actualCost}`);
      confidence -= 20;
    }

    // Check maintenance status
    if (maintenance.status === 'completed' || maintenance.status === 'cancelled') {
      discrepancies.push(`Maintenance status is ${maintenance.status} (may not need invoice)`);
      confidence -= 10;
    } else if (maintenance.status === 'approved' || maintenance.status === 'in_progress') {
      confidence += 10;
      reasons.push(`Maintenance status is ${maintenance.status}`);
    }

    return {
      maintenanceId: maintenance.id,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasons,
      discrepancies
    };
  }

  /**
   * Simple fuzzy string matching (0-1 score)
   */
  private static fuzzyMatch(str1: string, str2: string): number {
    // Exact match
    if (str1 === str2) return 1;

    // Substring match
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;

    // Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Link invoice to maintenance request
   */
  static async linkInvoiceToMaintenance(
    invoiceId: number,
    maintenanceId: number,
    confidence: number
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    await db
      .update(invoices)
      .set({
        matchedMaintenanceId: maintenanceId,
        matchConfidence: confidence.toString()
      })
      .where(eq(invoices.id, invoiceId));

    return true;
  }
}
