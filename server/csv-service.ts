import { parse } from 'csv-parse/sync';
import { z } from 'zod';

/**
 * CSV Service - Handles parsing, validation, and importing CSV data
 * Supports multiple data types with modular validation schemas
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const rentArrearsSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID required'),
  tenantName: z.string().min(1, 'Tenant name required'),
  propertyAddress: z.string().min(1, 'Property address required'),
  propertyId: z.string().min(1, 'Property ID required'),
  weeklyRent: z.coerce.number().positive('Weekly rent must be positive'),
  lastPaymentDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  daysOverdue: z.coerce.number().nonnegative('Days overdue must be >= 0'),
  amountOwed: z.coerce.number().positive('Amount owed must be positive'),
  paymentArrangement: z.string().optional().nullable(),
  arrangementBroken: z.enum(['TRUE', 'FALSE', 'true', 'false']).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const maintenanceSchema = z.object({
  maintenanceId: z.string().min(1, 'Maintenance ID required'),
  propertyId: z.string().min(1, 'Property ID required'),
  propertyAddress: z.string().min(1, 'Property address required'),
  description: z.string().min(1, 'Description required'),
  category: z.enum(['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'General', 'Other']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  estimatedCost: z.coerce.number().positive('Estimated cost must be positive'),
  actualCost: z.coerce.number().positive('Actual cost must be positive').optional().nullable(),
  requestDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  scheduledDate: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  completionDate: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  contractorName: z.string().optional().nullable(),
  contractorPhone: z.string().optional().nullable(),
  status: z.enum(['Pending Approval', 'Approved', 'In Progress', 'Completed', 'Cancelled']),
  notes: z.string().optional().nullable(),
});

export const tenantSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number required'),
  dateOfBirth: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  employmentStatus: z.enum(['Employed', 'Self-Employed', 'Retired', 'Student', 'Unemployed', 'Other']).optional().nullable(),
  employer: z.string().optional().nullable(),
  annualIncome: z.coerce.number().positive('Annual income must be positive').optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  moveInDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  moveOutDate: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  leaseStartDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  leaseEndDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  status: z.enum(['Active', 'Notice Given', 'Moved Out', 'Blacklisted']),
  notes: z.string().optional().nullable(),
});

export const tenancySchema = z.object({
  tenancyId: z.string().min(1, 'Tenancy ID required'),
  tenantId: z.string().min(1, 'Tenant ID required'),
  propertyId: z.string().min(1, 'Property ID required'),
  propertyAddress: z.string().min(1, 'Property address required'),
  leaseStartDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  leaseEndDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  weeklyRent: z.coerce.number().positive('Weekly rent must be positive'),
  bondAmount: z.coerce.number().positive('Bond amount must be positive'),
  leaseType: z.enum(['Fixed Term', 'Periodic']),
  renewalDate: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  status: z.enum(['Active', 'Ending Soon', 'Ended', 'Terminated']),
  notes: z.string().optional().nullable(),
});

export const scheduledTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID required'),
  propertyId: z.string().min(1, 'Property ID required'),
  propertyAddress: z.string().min(1, 'Property address required'),
  taskType: z.enum(['Inspection', 'Maintenance', 'Cleaning', 'Meter Reading', 'Other']),
  description: z.string().min(1, 'Description required'),
  frequency: z.enum(['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually', 'One-Off']),
  nextDueDate: z.string().date('Invalid date format (YYYY-MM-DD)'),
  lastCompletedDate: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled']),
  notes: z.string().optional().nullable(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RentArrears = z.infer<typeof rentArrearsSchema>;
export type Maintenance = z.infer<typeof maintenanceSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type Tenancy = z.infer<typeof tenancySchema>;
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>;

// ============================================================================
// CSV PARSING SERVICE
// ============================================================================

export interface ParseResult<T> {
  success: boolean;
  data?: T[];
  errors?: ParseError[];
  summary?: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
  };
}

export interface ParseError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export class CSVService {
  /**
   * Parse and validate CSV file content
   */
  static parseCSV(content: string): Record<string, string>[] {
    try {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
      return records;
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate parsed records against schema
   */
  static validateRecords<T>(records: Record<string, string>[], schema: z.ZodSchema): ParseResult<T> {
    const errors: ParseError[] = [];
    const validData: T[] = [];

    records.forEach((record, index) => {
      try {
        const validated = schema.parse(record);
        validData.push(validated as T);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((err: z.ZodIssue) => {
            errors.push({
              row: index + 2, // +2 because row 1 is headers, 0-indexed
              field: String(err.path[0]),
              value: String(record[String(err.path[0])] || ''),
              error: err.message,
            });
          });
        }
      }
    });

    return {
      success: errors.length === 0,
      data: validData,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalRows: records.length,
        successfulRows: validData.length,
        failedRows: errors.length > 0 ? records.length - validData.length : 0,
      },
    };
  }

  /**
   * Import rent arrears CSV
   */
  static importRentArrears(content: string): ParseResult<RentArrears> {
    const records = this.parseCSV(content);
    return this.validateRecords(records, rentArrearsSchema);
  }

  /**
   * Import maintenance jobs CSV
   */
  static importMaintenance(content: string): ParseResult<Maintenance> {
    const records = this.parseCSV(content);
    return this.validateRecords(records, maintenanceSchema);
  }

  /**
   * Import tenants CSV
   */
  static importTenants(content: string): ParseResult<Tenant> {
    const records = this.parseCSV(content);
    return this.validateRecords(records, tenantSchema);
  }

  /**
   * Import tenancies CSV
   */
  static importTenancies(content: string): ParseResult<Tenancy> {
    const records = this.parseCSV(content);
    return this.validateRecords(records, tenancySchema);
  }

  /**
   * Import scheduled tasks CSV
   */
  static importScheduledTasks(content: string): ParseResult<ScheduledTask> {
    const records = this.parseCSV(content);
    return this.validateRecords(records, scheduledTaskSchema);
  }

  /**
   * Generate CSV template with headers
   */
  static generateTemplate(type: 'rent-arrears' | 'maintenance' | 'tenants' | 'tenancies' | 'scheduled-tasks'): string {
    const templates: Record<string, string> = {
      'rent-arrears': 'tenantId,tenantName,propertyAddress,propertyId,weeklyRent,lastPaymentDate,daysOverdue,amountOwed,paymentArrangement,arrangementBroken,notes',
      'maintenance': 'maintenanceId,propertyId,propertyAddress,description,category,priority,estimatedCost,actualCost,requestDate,scheduledDate,completionDate,contractorName,contractorPhone,status,notes',
      'tenants': 'tenantId,firstName,lastName,email,phone,dateOfBirth,employmentStatus,employer,annualIncome,emergencyContact,emergencyPhone,moveInDate,moveOutDate,leaseStartDate,leaseEndDate,status,notes',
      'tenancies': 'tenancyId,tenantId,propertyId,propertyAddress,leaseStartDate,leaseEndDate,weeklyRent,bondAmount,leaseType,renewalDate,status,notes',
      'scheduled-tasks': 'taskId,propertyId,propertyAddress,taskType,description,frequency,nextDueDate,lastCompletedDate,priority,assignedTo,status,notes',
    };

    return templates[type] || '';
  }

  /**
   * Generate example CSV data
   */
  static generateExampleData(type: 'rent-arrears' | 'maintenance' | 'tenants' | 'tenancies' | 'scheduled-tasks'): string {
    const examples: Record<string, string> = {
      'rent-arrears': `tenantId,tenantName,propertyAddress,propertyId,weeklyRent,lastPaymentDate,daysOverdue,amountOwed,paymentArrangement,arrangementBroken,notes
T001,John Smith,123 Main St Auckland,P001,500.00,2025-12-15,15,2500.00,$250/week until Jan 31,FALSE,Tenant contacted
T002,Jane Doe,456 Queen Ave Auckland,P002,450.00,2025-12-10,20,2250.00,Broken arrangement,TRUE,Legal action pending`,
      'maintenance': `maintenanceId,propertyId,propertyAddress,description,category,priority,estimatedCost,actualCost,requestDate,scheduledDate,completionDate,contractorName,contractorPhone,status,notes
M001,P001,123 Main St Auckland,Fix hot water system,Plumbing,High,450.00,425.00,2025-12-20,2025-12-28,2025-12-27,ABC Plumbing,09 555 1234,Completed,Tenant available after 5pm
M002,P002,456 Queen Ave Auckland,Paint bedroom,Painting,Low,200.00,,2025-12-18,2026-01-10,,Colour Painters,09 555 5678,Approved,Tenant prefers neutral colours`,
      'tenants': `tenantId,firstName,lastName,email,phone,dateOfBirth,employmentStatus,employer,annualIncome,emergencyContact,emergencyPhone,moveInDate,moveOutDate,leaseStartDate,leaseEndDate,status,notes
T001,John,Smith,john.smith@example.com,021 555 1234,1985-06-15,Employed,ABC Corporation,75000.00,Jane Smith,021 555 5678,2025-01-01,,2025-01-01,2026-01-01,Active,Good tenant
T002,Jane,Doe,jane.doe@example.com,021 555 5678,1990-03-22,Employed,XYZ Ltd,65000.00,Bob Doe,021 555 9999,2024-06-01,,2024-06-01,2025-06-01,Notice Given,Moving overseas`,
      'tenancies': `tenancyId,tenantId,propertyId,propertyAddress,leaseStartDate,leaseEndDate,weeklyRent,bondAmount,leaseType,renewalDate,status,notes
TN001,T001,P001,123 Main St Auckland,2025-01-01,2026-01-01,500.00,2000.00,Fixed Term,,Active,Fixed 12-month lease
TN002,T002,P002,456 Queen Ave Auckland,2024-06-01,2025-06-01,450.00,1800.00,Periodic,2025-06-01,Ending Soon,Tenant given notice`,
      'scheduled-tasks': `taskId,propertyId,propertyAddress,taskType,description,frequency,nextDueDate,lastCompletedDate,priority,assignedTo,status,notes
TASK001,P001,123 Main St Auckland,Inspection,Quarterly property inspection,Quarterly,2026-01-15,2025-10-15,High,John Manager,Pending,Check for water damage
TASK002,P002,456 Queen Ave Auckland,Maintenance,HVAC filter replacement,Monthly,2026-01-05,2025-12-05,Medium,Service Team,Completed,`,
    };

    return examples[type] || '';
  }
}

// ============================================================================
// DATA SOURCE ABSTRACTION LAYER
// ============================================================================

/**
 * Abstraction layer that allows switching between API and CSV data sources
 */

export interface DataSource {
  type: 'api' | 'csv';
  enabled: boolean;
  lastSync?: Date;
}

export interface DualModeDataFetcher<T> {
  /**
   * Fetch data from either API or CSV depending on configuration
   */
  fetch(): Promise<T[]>;

  /**
   * Get current data source
   */
  getSource(): DataSource;

  /**
   * Switch data source
   */
  setSource(source: 'api' | 'csv'): void;
}

/**
 * Factory function to create dual-mode data fetchers
 */
export function createDualModeDataFetcher<T>(
  apiFetcher: () => Promise<T[]>,
  csvData: T[] | null,
  currentSource: 'api' | 'csv' = 'api'
): DualModeDataFetcher<T> {
  let activeSource = currentSource;

  return {
    async fetch(): Promise<T[]> {
      if (activeSource === 'api') {
        try {
          return await apiFetcher();
        } catch (error) {
          console.warn('API fetch failed, falling back to CSV:', error);
          activeSource = 'csv';
          return csvData || [];
        }
      } else {
        return csvData || [];
      }
    },

    getSource(): DataSource {
      return {
        type: activeSource,
        enabled: true,
        lastSync: new Date(),
      };
    },

    setSource(source: 'api' | 'csv'): void {
      activeSource = source;
    },
  };
}
