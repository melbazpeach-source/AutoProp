import * as dbModule from "./db";
import type { InsertTicket, InsertTicketComment } from "../drizzle/schema";

const db = dbModule as any; // Use db module functions

/**
 * Ticket Automation Service
 * Handles auto-ticket creation from incoming communications with smart linking
 */

interface IncomingCommunication {
  channel: "email" | "sms" | "whatsapp" | "phone" | "in_person";
  fromAddress: string; // email or phone number
  toAddress: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

interface TicketMatchResult {
  existingTicketId?: number;
  linkedPropertyId?: number;
  linkedTenantId?: number;
  linkedTenancyId?: number;
  linkedPalaceWoNumber?: string;
}

/**
 * Extract potential identifiers from message content
 */
function extractIdentifiers(text: string): {
  addresses: string[];
  woNumbers: string[];
  emails: string[];
  phones: string[];
} {
  const addresses: string[] = [];
  const woNumbers: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];

  // Extract email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) emails.push(...emailMatches);

  // Extract phone numbers (NZ format)
  const phoneRegex = /(\+64|0)\s?(\d{1,2})\s?(\d{3})\s?(\d{4})/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) phones.push(...phoneMatches.map(p => p.replace(/\s/g, "")));

  // Extract Palace WO numbers (format: WO-XXXXX or #XXXXX)
  const woRegex = /(WO-\d+|#\d{4,})/gi;
  const woMatches = text.match(woRegex);
  if (woMatches) woNumbers.push(...woMatches);

  // Extract addresses (simplified - looks for street numbers + street names)
  const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl)/gi;
  const addressMatches = text.match(addressRegex);
  if (addressMatches) addresses.push(...addressMatches);

  return { addresses, woNumbers, emails, phones };
}

/**
 * Find existing open ticket for this sender
 */
async function findExistingTicket(
  senderEmail?: string,
  senderPhone?: string
): Promise<number | undefined> {
  try {
    // Look for open tickets from this sender in the last 30 days
    const tickets = await db.getTickets();
    
    const recentTickets = tickets.filter((ticket: any) => {
      // Only consider open/in-progress tickets
      if (!['new', 'open', 'in_progress', 'awaiting_approval'].includes(ticket.status)) {
        return false;
      }

      // Check if created in last 30 days
      const daysSinceCreated = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > 30) {
        return false;
      }

      // Match by sender email or phone
      if (senderEmail && ticket.senderEmail === senderEmail) return true;
      if (senderPhone && ticket.senderPhone === senderPhone) return true;

      return false;
    });

    // Return the most recent matching ticket
    if (recentTickets.length > 0) {
      return recentTickets.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0].id;
    }

    return undefined;
  } catch (error) {
    console.error("[Ticket Automation] Error finding existing ticket:", error);
    return undefined;
  }
}

/**
 * Smart linking: find related property, tenant, tenancy, WO number
 */
async function smartLink(
  senderEmail?: string,
  senderPhone?: string,
  messageContent?: string
): Promise<TicketMatchResult> {
  const result: TicketMatchResult = {};

  try {
    // Extract identifiers from message
    const identifiers = messageContent ? extractIdentifiers(messageContent) : { addresses: [], woNumbers: [], emails: [], phones: [] };

    // Find tenant by email or phone
    const tenants = await db.getTenants();
    const matchedTenant = tenants.find((t: any) => 
      (senderEmail && t.email === senderEmail) ||
      (senderPhone && t.phone === senderPhone)
    );

    if (matchedTenant) {
      result.linkedTenantId = matchedTenant.id;

      // Find active tenancy for this tenant
      const tenancies = await db.getTenancies();
      const activeTenancy = tenancies.find((t: any) => 
        t.tenantId === matchedTenant.id && 
        t.status === 'active'
      );

      if (activeTenancy) {
        result.linkedTenancyId = activeTenancy.id;
        result.linkedPropertyId = activeTenancy.propertyId;
      }
    }

    // Try to match property by address mentioned in message
    if (!result.linkedPropertyId && identifiers.addresses.length > 0) {
      const properties = await db.getProperties();
      for (const address of identifiers.addresses) {
        const matchedProperty = properties.find((p: any) => 
          p.address && p.address.toLowerCase().includes(address.toLowerCase())
        );
        if (matchedProperty) {
          result.linkedPropertyId = matchedProperty.id;
          break;
        }
      }
    }

    // Extract Palace WO number if mentioned
    if (identifiers.woNumbers.length > 0) {
      result.linkedPalaceWoNumber = identifiers.woNumbers[0];
    }

  } catch (error) {
    console.error("[Ticket Automation] Error in smart linking:", error);
  }

  return result;
}

/**
 * Generate unique ticket number
 */
function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

/**
 * Determine ticket type from message content
 */
function determineTicketType(subject?: string, body?: string): "inquiry" | "maintenance" | "complaint" | "arrears" | "viewing" | "application" | "other" {
  const content = `${subject || ""} ${body || ""}`.toLowerCase();

  if (content.includes("maintenance") || content.includes("repair") || content.includes("broken") || content.includes("leak")) {
    return "maintenance";
  }
  if (content.includes("complaint") || content.includes("noise") || content.includes("issue")) {
    return "complaint";
  }
  if (content.includes("rent") || content.includes("payment") || content.includes("overdue") || content.includes("arrears")) {
    return "arrears";
  }
  if (content.includes("viewing") || content.includes("inspection") || content.includes("visit")) {
    return "viewing";
  }
  if (content.includes("application") || content.includes("apply")) {
    return "application";
  }

  return "inquiry";
}

/**
 * Main function: Create ticket from incoming communication
 */
export async function createTicketFromCommunication(
  communication: IncomingCommunication
): Promise<{ ticketId: number; isNewTicket: boolean }> {
  try {
    console.log("[Ticket Automation] Processing incoming communication:", {
      channel: communication.channel,
      from: communication.fromAddress,
      subject: communication.subject,
    });

    // Step 1: Check for existing ticket from this sender
    const existingTicketId = await findExistingTicket(
      communication.channel === "email" ? communication.fromAddress : undefined,
      communication.channel === "sms" || communication.channel === "whatsapp" ? communication.fromAddress : undefined
    );

    // Step 2: Smart linking
    const linkResult = await smartLink(
      communication.channel === "email" ? communication.fromAddress : undefined,
      communication.channel === "sms" || communication.channel === "whatsapp" ? communication.fromAddress : undefined,
      `${communication.subject || ""} ${communication.body}`
    );

    // Step 3: If existing ticket found, add as comment
    if (existingTicketId) {
      console.log("[Ticket Automation] Adding to existing ticket:", existingTicketId);

      const comment: InsertTicketComment = {
        ticketId: existingTicketId,
        commentType: "inbound",
        content: communication.body,
        senderName: communication.fromAddress,
        senderEmail: communication.channel === "email" ? communication.fromAddress : undefined,
        senderPhone: communication.channel === "sms" || communication.channel === "whatsapp" ? communication.fromAddress : undefined,
        metadata: JSON.stringify({ channel: communication.channel, ...communication.metadata }),
      };

      await db.createTicketComment(comment);

      return { ticketId: existingTicketId, isNewTicket: false };
    }

    // Step 4: Create new ticket
    console.log("[Ticket Automation] Creating new ticket");

    const ticketType = determineTicketType(communication.subject, communication.body);

    const newTicket: InsertTicket = {
      ticketNumber: generateTicketNumber(),
      type: ticketType,
      category: "communication",
      source: communication.channel,
      status: "new",
      priority: "medium",
      subject: communication.subject || `${communication.channel.toUpperCase()} from ${communication.fromAddress}`,
      description: communication.body,
      senderEmail: communication.channel === "email" ? communication.fromAddress : undefined,
      senderPhone: communication.channel === "sms" || communication.channel === "whatsapp" ? communication.fromAddress : undefined,
      tenantId: linkResult.linkedTenantId,
      propertyId: linkResult.linkedPropertyId,
      tenancyId: linkResult.linkedTenancyId,
      palaceWoNumber: linkResult.linkedPalaceWoNumber,
      tags: JSON.stringify([communication.channel, ticketType]),
    };

    const createdTicket = await db.createTicket(newTicket);

    console.log("[Ticket Automation] Ticket created:", createdTicket.id);

    return { ticketId: createdTicket.id, isNewTicket: true };

  } catch (error) {
    console.error("[Ticket Automation] Error creating ticket:", error);
    throw error;
  }
}

/**
 * Webhook handler for incoming emails
 */
export async function handleIncomingEmail(emailData: {
  from: string;
  to: string;
  subject: string;
  body: string;
  headers?: Record<string, string>;
}) {
  return await createTicketFromCommunication({
    channel: "email",
    fromAddress: emailData.from,
    toAddress: emailData.to,
    subject: emailData.subject,
    body: emailData.body,
    metadata: { headers: emailData.headers },
  });
}

/**
 * Webhook handler for incoming SMS
 */
export async function handleIncomingSMS(smsData: {
  from: string;
  to: string;
  body: string;
  messageId?: string;
}) {
  return await createTicketFromCommunication({
    channel: "sms",
    fromAddress: smsData.from,
    toAddress: smsData.to,
    body: smsData.body,
    metadata: { messageId: smsData.messageId },
  });
}

/**
 * Webhook handler for incoming WhatsApp messages
 */
export async function handleIncomingWhatsApp(whatsappData: {
  from: string;
  to: string;
  body: string;
  messageId?: string;
}) {
  return await createTicketFromCommunication({
    channel: "whatsapp",
    fromAddress: whatsappData.from,
    toAddress: whatsappData.to,
    body: whatsappData.body,
    metadata: { messageId: whatsappData.messageId },
  });
}
