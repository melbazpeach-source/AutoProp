import { eq, and, gte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  properties, InsertProperty, Property,
  tenants, InsertTenant, Tenant,
  rentArrears, InsertRentArrear, RentArrear,
  maintenanceRequests, InsertMaintenanceRequest, MaintenanceRequest,
  communications, InsertCommunication, Communication,
  tickets, InsertTicket, Ticket,
  ticketActivities, InsertTicketActivity,
  viewings, InsertViewing, Viewing,
  calendarSlots, InsertCalendarSlot, CalendarSlot,
  documents, InsertDocument, Document,
  notifications, InsertNotification, Notification,
  dailySummaries, InsertDailySummary, DailySummary,
  integrationSettings, InsertIntegrationSetting, IntegrationSetting
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// User Management
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

// ============================================================================
// Property Management
// ============================================================================

export async function upsertProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!property.palaceId) {
    // Insert without palace ID
    const result = await db.insert(properties).values(property);
    return result;
  }

  // Check if property exists
  const existing = await db.select().from(properties).where(eq(properties.palaceId, property.palaceId)).limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(properties).set(property).where(eq(properties.palaceId, property.palaceId));
    return existing[0];
  } else {
    // Insert new
    const result = await db.insert(properties).values(property);
    return result;
  }
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPropertyByPalaceId(palaceId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(properties).where(eq(properties.palaceId, palaceId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllProperties() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(properties);
}

export async function getPropertiesByStatus(status: Property['status']) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(properties).where(eq(properties.status, status));
}

// ============================================================================
// Tenant Management
// ============================================================================

export async function upsertTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!tenant.palaceId) {
    const result = await db.insert(tenants).values(tenant);
    return result;
  }

  const existing = await db.select().from(tenants).where(eq(tenants.palaceId, tenant.palaceId)).limit(1);

  if (existing.length > 0) {
    await db.update(tenants).set(tenant).where(eq(tenants.palaceId, tenant.palaceId));
    return existing[0];
  } else {
    const result = await db.insert(tenants).values(tenant);
    return result;
  }
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTenantsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
}

export async function getActiveTenants() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tenants).where(eq(tenants.status, 'active'));
}

// ============================================================================
// Rent Arrears Management
// ============================================================================

export async function upsertRentArrear(arrear: InsertRentArrear) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if arrear exists for this tenant
  const existing = await db.select().from(rentArrears)
    .where(eq(rentArrears.tenantId, arrear.tenantId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(rentArrears).set(arrear).where(eq(rentArrears.tenantId, arrear.tenantId));
    return existing[0];
  } else {
    const result = await db.insert(rentArrears).values(arrear);
    return result;
  }
}

export async function getRentArrearsByTenantId(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rentArrears).where(eq(rentArrears.tenantId, tenantId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getArrearsRequiringAction(minDaysOverdue: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    arrear: rentArrears,
    tenant: tenants,
    property: properties,
  })
  .from(rentArrears)
  .leftJoin(tenants, eq(rentArrears.tenantId, tenants.id))
  .leftJoin(properties, eq(rentArrears.propertyId, properties.id))
  .where(
    sql`${rentArrears.daysOverdue} >= ${minDaysOverdue} OR ${rentArrears.paymentArrangementBroken} = true`
  );
}

export async function getAllRentArrears() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rentArrears);
}

// ============================================================================
// Maintenance Management
// ============================================================================

export async function createMaintenanceRequest(request: InsertMaintenanceRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(maintenanceRequests).values(request);
}

export async function updateMaintenanceRequest(id: number, updates: Partial<InsertMaintenanceRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(maintenanceRequests).set(updates).where(eq(maintenanceRequests.id, id));
}

export async function getMaintenanceRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getMaintenanceRequestsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.propertyId, propertyId));
}

export async function getPendingMaintenanceRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(maintenanceRequests)
    .where(eq(maintenanceRequests.status, 'pending_approval'));
}

export async function getMaintenanceRequestsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(maintenanceRequests)
    .where(
      and(
        gte(maintenanceRequests.scheduledDate, startDate),
        sql`${maintenanceRequests.scheduledDate} <= ${endDate}`
      )
    );
}

// ============================================================================
// Communication Management
// ============================================================================

export async function createCommunication(communication: InsertCommunication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(communications).values(communication);
}

export async function getCommunicationsByTicketId(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(communications)
    .where(eq(communications.ticketId, ticketId))
    .orderBy(desc(communications.createdAt));
}

export async function getCommunicationsByTenantId(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(communications)
    .where(eq(communications.tenantId, tenantId))
    .orderBy(desc(communications.createdAt));
}

export async function getRecentCommunications(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(communications)
    .orderBy(desc(communications.createdAt))
    .limit(limit);
}

// ============================================================================
// Ticket Management
// ============================================================================

export async function createTicket(ticket: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(tickets).values(ticket);
}

export async function updateTicket(id: number, updates: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(tickets).set(updates).where(eq(tickets.id, id));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTicketsByStatus(status: Ticket['status']) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tickets).where(eq(tickets.status, status));
}

export async function getTicketsByAssignee(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tickets).where(eq(tickets.assignedTo, userId));
}

export async function getAllTickets() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function createTicketActivity(activity: InsertTicketActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(ticketActivities).values(activity);
}

export async function getTicketActivities(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ticketActivities)
    .where(eq(ticketActivities.ticketId, ticketId))
    .orderBy(desc(ticketActivities.createdAt));
}

// ============================================================================
// Viewing Management
// ============================================================================

export async function createViewing(viewing: InsertViewing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(viewings).values(viewing);
}

export async function updateViewing(id: number, updates: Partial<InsertViewing>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(viewings).set(updates).where(eq(viewings.id, id));
}

export async function getViewingById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(viewings).where(eq(viewings.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPendingViewings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(viewings).where(eq(viewings.status, 'pending_approval'));
}

export async function getViewingsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(viewings).where(eq(viewings.propertyId, propertyId));
}

// ============================================================================
// Calendar Slot Management
// ============================================================================

export async function createCalendarSlot(slot: InsertCalendarSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(calendarSlots).values(slot);
}

export async function updateCalendarSlot(id: number, updates: Partial<InsertCalendarSlot>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(calendarSlots).set(updates).where(eq(calendarSlots.id, id));
}

export async function getAvailableSlots(slotType: CalendarSlot['slotType'], startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(calendarSlots)
    .where(
      and(
        eq(calendarSlots.slotType, slotType),
        eq(calendarSlots.available, true),
        gte(calendarSlots.startTime, startDate),
        sql`${calendarSlots.endTime} <= ${endDate}`
      )
    );
}

// ============================================================================
// Document Management
// ============================================================================

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(documents).values(document);
}

export async function getDocumentsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.propertyId, propertyId));
}

export async function getDocumentsByTenantId(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.tenantId, tenantId));
}

export async function getDocumentsByType(documentType: Document['documentType']) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.documentType, documentType));
}

// ============================================================================
// Notification Management
// ============================================================================

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notifications).values(notification);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}

// ============================================================================
// Daily Summary Management
// ============================================================================

export async function createDailySummary(summary: InsertDailySummary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(dailySummaries).values(summary);
}

export async function getDailySummaryByDate(date: Date, managerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailySummaries)
    .where(and(eq(dailySummaries.summaryDate, date), eq(dailySummaries.managerId, managerId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getRecentDailySummaries(managerId: number, limit: number = 7) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dailySummaries)
    .where(eq(dailySummaries.managerId, managerId))
    .orderBy(desc(dailySummaries.summaryDate))
    .limit(limit);
}

// ============================================================================
// Integration Settings Management
// ============================================================================

export async function upsertIntegrationSetting(setting: InsertIntegrationSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(integrationSettings)
    .where(eq(integrationSettings.service, setting.service))
    .limit(1);

  if (existing.length > 0) {
    await db.update(integrationSettings).set(setting).where(eq(integrationSettings.service, setting.service));
    return existing[0];
  } else {
    const result = await db.insert(integrationSettings).values(setting);
    return result;
  }
}

export async function getIntegrationSetting(service: IntegrationSetting['service']) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(integrationSettings)
    .where(eq(integrationSettings.service, service))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllIntegrationSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(integrationSettings);
}
