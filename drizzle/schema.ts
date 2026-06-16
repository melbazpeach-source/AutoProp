import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Properties synced from Palace.com CRM
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  palaceId: varchar("palaceId", { length: 128 }).unique(), // External ID from Palace.com
  address: text("address").notNull(),
  suburb: varchar("suburb", { length: 128 }),
  state: varchar("state", { length: 64 }),
  postcode: varchar("postcode", { length: 16 }),
  propertyType: varchar("propertyType", { length: 64 }), // house, apartment, townhouse, etc.
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  parkingSpaces: int("parkingSpaces"),
  weeklyRent: decimal("weeklyRent", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["vacant", "occupied", "maintenance", "advertising"]).notNull(),
  managerId: int("managerId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Tenants synced from Palace.com CRM
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  palaceId: varchar("palaceId", { length: 128 }).unique(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  mobilePhone: varchar("mobilePhone", { length: 32 }),
  propertyId: int("propertyId").references(() => properties.id),
  leaseStartDate: timestamp("leaseStartDate"),
  leaseEndDate: timestamp("leaseEndDate"),
  rentAmount: decimal("rentAmount", { precision: 10, scale: 2 }),
  rentFrequency: mysqlEnum("rentFrequency", ["weekly", "fortnightly", "monthly"]),
  bondAmount: decimal("bondAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["active", "pending", "ended", "breached"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/**
 * Rent arrears tracking
 */
export const rentArrears = mysqlTable("rentArrears", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  amountOwed: decimal("amountOwed", { precision: 10, scale: 2 }).notNull(),
  daysOverdue: int("daysOverdue").notNull(),
  lastPaymentDate: timestamp("lastPaymentDate"),
  paymentArrangementBroken: boolean("paymentArrangementBroken").default(false),
  breachLetterSent: boolean("breachLetterSent").default(false),
  breachLetterDate: timestamp("breachLetterDate"),
  escalationLevel: mysqlEnum("escalationLevel", ["none", "reminder", "breach", "legal"]).default("none"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RentArrear = typeof rentArrears.$inferSelect;
export type InsertRentArrear = typeof rentArrears.$inferInsert;

/**
 * Communication channels and messages
 */
export const communications = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp", "phone", "voicemail"]).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  fromAddress: varchar("fromAddress", { length: 320 }), // email, phone number, etc.
  toAddress: varchar("toAddress", { length: 320 }),
  subject: text("subject"),
  body: text("body"),
  attachmentUrls: text("attachmentUrls"), // JSON array of S3 URLs
  tenantId: int("tenantId").references(() => tenants.id),
  propertyId: int("propertyId").references(() => properties.id),
  ticketId: int("ticketId"), // References tickets.id (circular ref resolved in comments)
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "scheduled", "sent", "failed", "cancelled"]).default("draft"),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  autoResponded: boolean("autoResponded").default(false),
  autoResponseSentAt: timestamp("autoResponseSentAt"),
  externalId: varchar("externalId", { length: 256 }), // Message ID from external system
  metadata: text("metadata"), // JSON for additional channel-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = typeof communications.$inferInsert;

/**
 * Ticket tracking system
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).unique().notNull(),
  type: mysqlEnum("type", ["inquiry", "maintenance", "complaint", "arrears", "viewing", "application", "other"]).notNull(),
  category: mysqlEnum("category", ["communication", "maintenance", "notice", "system_note"]).default("communication"),
  status: mysqlEnum("status", ["new", "open", "pending", "in_progress", "awaiting_approval", "approved", "sent", "resolved", "closed"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  source: mysqlEnum("source", ["email", "sms", "whatsapp", "phone", "in_person", "manual", "palace_import", "system"]).default("manual"),
  subject: text("subject").notNull(),
  description: text("description"),
  tenantId: int("tenantId").references(() => tenants.id),
  propertyId: int("propertyId").references(() => properties.id),
  tenancyId: int("tenancyId").references(() => tenancies.id),
  assignedTo: int("assignedTo").references(() => users.id),
  createdBy: int("createdBy").references(() => users.id),
  palaceWoNumber: varchar("palaceWoNumber", { length: 64 }), // Palace Work Order number
  communicationId: int("communicationId"), // Link to communication if applicable (circular ref resolved in comments)
  parentTicketId: int("parentTicketId"), // For threading related tickets
  senderEmail: varchar("senderEmail", { length: 320 }), // Original sender email
  senderPhone: varchar("senderPhone", { length: 32 }), // Original sender phone
  resolvedAt: timestamp("resolvedAt"),
  closedAt: timestamp("closedAt"),
  dueDate: timestamp("dueDate"),
  tags: text("tags"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Ticket activity log
 */
export const ticketActivities = mysqlTable("ticketActivities", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id),
  userId: int("userId").references(() => users.id),
  activityType: mysqlEnum("activityType", ["created", "updated", "assigned", "commented", "status_changed", "resolved", "closed"]).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketActivity = typeof ticketActivities.$inferSelect;
export type InsertTicketActivity = typeof ticketActivities.$inferInsert;

/**
 * Ticket comments for threading conversations
 */
export const ticketComments = mysqlTable("ticketComments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull().references(() => tickets.id),
  userId: int("userId").references(() => users.id),
  commentType: mysqlEnum("commentType", ["inbound", "outbound", "internal_note"]).notNull(),
  content: text("content").notNull(),
  communicationId: int("communicationId").references(() => communications.id), // Link to actual communication if applicable
  senderName: varchar("senderName", { length: 255 }), // For external senders
  senderEmail: varchar("senderEmail", { length: 320 }),
  senderPhone: varchar("senderPhone", { length: 32 }),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = typeof ticketComments.$inferInsert;

/**
 * Maintenance requests and planning
 */
export const maintenanceRequests = mysqlTable("maintenanceRequests", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  tenantId: int("tenantId").references(() => tenants.id),
  ticketId: int("ticketId").references(() => tickets.id),
  title: text("title").notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["plumbing", "electrical", "hvac", "structural", "appliance", "pest", "garden", "other"]),
  urgency: mysqlEnum("urgency", ["routine", "urgent", "emergency"]).default("routine"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "scheduled", "in_progress", "completed", "cancelled"]).notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 10, scale: 2 }),
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  contractorName: varchar("contractorName", { length: 256 }),
  contractorContact: varchar("contractorContact", { length: 128 }),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  documentUrls: text("documentUrls"), // JSON array of S3 URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = typeof maintenanceRequests.$inferInsert;

/**
 * Property viewings and bookings
 */
export const viewings = mysqlTable("viewings", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  prospectName: varchar("prospectName", { length: 256 }).notNull(),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  prospectPhone: varchar("prospectPhone", { length: 32 }),
  scheduledDate: timestamp("scheduledDate").notNull(),
  duration: int("duration").default(30), // minutes
  status: mysqlEnum("status", ["pending_approval", "approved", "confirmed", "completed", "cancelled", "no_show"]).notNull(),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  moveInCostsSent: boolean("moveInCostsSent").default(false),
  applicationFormSent: boolean("applicationFormSent").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Viewing = typeof viewings.$inferSelect;
export type InsertViewing = typeof viewings.$inferInsert;

/**
 * Calendar time slots for HITL approval
 */
export const calendarSlots = mysqlTable("calendarSlots", {
  id: int("id").autoincrement().primaryKey(),
  slotType: mysqlEnum("slotType", ["viewing", "maintenance", "inspection"]).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  available: boolean("available").default(true),
  allocatedBy: int("allocatedBy").references(() => users.id),
  propertyId: int("propertyId").references(() => properties.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarSlot = typeof calendarSlots.$inferSelect;
export type InsertCalendarSlot = typeof calendarSlots.$inferInsert;

/**
 * Documents stored in S3
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["application", "lease", "breach_letter", "maintenance_report", "inspection", "communication_attachment", "other"]).notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }), // bytes
  propertyId: int("propertyId").references(() => properties.id),
  tenantId: int("tenantId").references(() => tenants.id),
  ticketId: int("ticketId").references(() => tickets.id),
  maintenanceRequestId: int("maintenanceRequestId").references(() => maintenanceRequests.id),
  uploadedBy: int("uploadedBy").references(() => users.id),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * User-defined categories
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["property", "maintenance", "tenant", "general"]).notNull(),
  color: varchar("color", { length: 7 }), // hex color
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Flexible tagging system
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Property tags (many-to-many)
 */
export const propertyTags = mysqlTable("propertyTags", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  tagId: int("tagId").references(() => tags.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Maintenance tags (many-to-many)
 */
export const maintenanceTags = mysqlTable("maintenanceTags", {
  id: int("id").autoincrement().primaryKey(),
  maintenanceRequestId: int("maintenanceRequestId").references(() => maintenanceRequests.id).notNull(),
  tagId: int("tagId").references(() => tags.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Tenant tags (many-to-many)
 */
export const tenantTags = mysqlTable("tenantTags", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").references(() => tenants.id).notNull(),
  tagId: int("tagId").references(() => tags.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Notifications for property managers
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["rent_arrears", "maintenance_urgent", "viewing_confirmation", "daily_summary", "ticket_assigned", "approval_required", "other"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  message: text("message").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  read: boolean("read").default(false),
  readAt: timestamp("readAt"),
  actionUrl: text("actionUrl"), // Link to relevant page
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Daily summary reports
 */
export const dailySummaries = mysqlTable("dailySummaries", {
  id: int("id").autoincrement().primaryKey(),
  summaryDate: timestamp("summaryDate").notNull(),
  managerId: int("managerId").notNull().references(() => users.id),
  totalTickets: int("totalTickets").default(0),
  newTickets: int("newTickets").default(0),
  resolvedTickets: int("resolvedTickets").default(0),
  arrearsCount: int("arrearsCount").default(0),
  maintenanceRequests: int("maintenanceRequests").default(0),
  viewingsScheduled: int("viewingsScheduled").default(0),
  summaryContent: text("summaryContent"), // LLM-generated summary
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = typeof dailySummaries.$inferInsert;

/**
 * Integration settings and API credentials
 */
export const integrationSettings = mysqlTable("integrationSettings", {
  id: int("id").autoincrement().primaryKey(),
  service: mysqlEnum('service', ['palace', 'outlook', 'vonage', 'slack', 'n8n', 'claude', 'chatgpt', 'gemini', 's3', 'google_drive', 'dropbox', 'onedrive', 'jotform', 'sms_forward']).notNull().unique(),
  enabled: boolean("enabled").default(false),
  configData: text("configData"), // JSON for API keys, endpoints, etc. (encrypted)
  lastSyncAt: timestamp("lastSyncAt"),
  syncStatus: mysqlEnum("syncStatus", ["idle", "syncing", "error"]).default("idle"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationSetting = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSetting = typeof integrationSettings.$inferInsert;

/**
 * Pending communications requiring HITL approval before sending
 */
export const pendingCommunications = mysqlTable('pendingCommunications', {
  id: int('id').autoincrement().primaryKey(),
  type: mysqlEnum('type', ['breach_letter', 'email', 'maintenance_confirmation', 'viewing_confirmation']).notNull(),
  recipientType: mysqlEnum('recipientType', ['tenant', 'contractor', 'owner']).notNull(),
  recipientId: int('recipientId').notNull(),
  recipientEmail: varchar('recipientEmail', { length: 320 }),
  recipientName: text('recipientName'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'sent']).default('pending').notNull(),
  relatedEntityType: varchar('relatedEntityType', { length: 50 }),
  relatedEntityId: int('relatedEntityId'),
  approvedBy: int('approvedBy'),
  approvedAt: timestamp('approvedAt'),
  rejectedBy: int('rejectedBy'),
  rejectedAt: timestamp('rejectedAt'),
  rejectionReason: text('rejectionReason'),
  sentAt: timestamp('sentAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type PendingCommunication = typeof pendingCommunications.$inferSelect;
export type InsertPendingCommunication = typeof pendingCommunications.$inferInsert;

/**
 * Email templates for common communication scenarios
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  category: mysqlEnum("category", ["rent_reminder", "maintenance", "viewing", "breach_letter", "general"]).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables"), // JSON array of variable names like ["tenant_name", "property_address", "amount_due"]
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Tenancies - linking tenants to properties with management features
 */
export const tenancies = mysqlTable("tenancies", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  tenantId: int("tenantId").references(() => tenants.id).notNull(),
  leaseStartDate: timestamp("leaseStartDate").notNull(),
  leaseEndDate: timestamp("leaseEndDate"),
  weeklyRent: decimal("weeklyRent", { precision: 10, scale: 2 }).notNull(),
  bondAmount: decimal("bondAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["active", "ending", "terminated", "completed"]).default("active").notNull(),
  tags: text("tags"), // JSON array of tag strings for filtering
  isFlagged: boolean("isFlagged").default(false), // Mark as important
  isPinned: boolean("isPinned").default(false), // Pin to top of list
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenancy = typeof tenancies.$inferSelect;
export type InsertTenancy = typeof tenancies.$inferInsert;

/**
 * Tenancy alerts for tracking important events
 */
export const tenancyAlerts = mysqlTable("tenancyAlerts", {
  id: int("id").autoincrement().primaryKey(),
  tenancyId: int("tenancyId").references(() => tenancies.id).notNull(),
  alertType: mysqlEnum("alertType", ["antisocial_behavior", "court_hearing", "complaint", "terminate", "rent_arrears", "breach_notice", "inspection_due", "lease_expiry", "other"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["active", "resolved", "dismissed"]).default("active").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  resolvedBy: int("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TenancyAlert = typeof tenancyAlerts.$inferSelect;
export type InsertTenancyAlert = typeof tenancyAlerts.$inferInsert;

// ============================================================================
// [graft] RECOVERED INVOICE SYSTEM (Vanessa's work) — appended additively.
// Reconstructed to preserve Vanessa's invoice table shape: the recovered
// Schema.ts.md was an OLD snapshot that predated invoicing, so the table
// definitions below are rebuilt from the field set documented in the graft
// brief and the exact columns referenced by the recovered tRPC router,
// OCR service and matching service. Conventions (int autoincrement PK,
// mysqlEnum, decimal precision/scale, timestamp defaults) match the
// existing tables in this file.
// ============================================================================

/**
 * Invoices received from contractors (OCR-extracted + auto-matched to maintenance)
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 128 }).notNull().unique(),
  contractorName: varchar("contractorName", { length: 256 }).notNull(),
  contractorEmail: varchar("contractorEmail", { length: 320 }),
  contractorPhone: varchar("contractorPhone", { length: 32 }),
  invoiceDate: timestamp("invoiceDate"),
  dueDate: timestamp("dueDate"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  gstAmount: decimal("gstAmount", { precision: 10, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  documentUrl: text("documentUrl"),
  ocrExtractedData: text("ocrExtractedData"), // JSON of OCRExtractedData
  matchedMaintenanceId: int("matchedMaintenanceId").references(() => maintenanceRequests.id),
  matchConfidence: decimal("matchConfidence", { precision: 5, scale: 2 }), // 0-100
  discrepancies: text("discrepancies"), // JSON array of discrepancy strings
  status: mysqlEnum("status", ["pending", "received", "under_review", "approved", "rejected", "paid", "overdue"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0"),
  paymentDate: timestamp("paymentDate"),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  paymentReference: varchar("paymentReference", { length: 256 }),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy").references(() => users.id),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Line items belonging to an invoice
 */
export const invoiceLineItems = mysqlTable("invoiceLineItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }),
  category: varchar("category", { length: 64 }), // labour|materials|equipment|other
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
