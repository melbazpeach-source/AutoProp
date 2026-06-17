import { verifyHmac } from "../_core/hmac";
import type { InboundCommsProvider, NormalizedInboundMessage } from "./types";

/**
 * [webhook] Vonage (formerly Nexmo) inbound adapter.
 *
 * Handles BOTH:
 *  - Vonage SMS inbound webhooks    (msisdn / to / text / messageId)
 *  - Vonage Messages-API WhatsApp   (from / to / message.content.text / message_uuid)
 *
 * Field names vary across Vonage product lines and over time, so parsing is
 * intentionally defensive.
 */

/**
 * [webhook] SIGNATURE EXTRACTION — ISOLATED HERE ON PURPOSE.
 *
 * This is the single spot to change if/when the real Vonage signing scheme is
 * confirmed. We currently pull a signature from common HMAC-style headers and
 * run a generic HMAC-SHA256 verification over the raw body via verifyHmac().
 *
 * [webhook] TODO: confirm exact Vonage signature scheme against a real inbound payload.
 * Vonage's documented inbound signing for the Messages API is frequently a
 * signed JWT in the `Authorization: Bearer <jwt>` header (HS256 using the
 * Signature Secret) rather than a plain HMAC-of-body header. If that proves to
 * be the case in production, replace the body-HMAC path below with JWT verify
 * (HS256, secret = Signature Secret) — the rest of the adapter is unaffected.
 */
function extractVonageSignature(headers: Record<string, any>): string {
  const h = headers || {};
  const candidate =
    h["x-vonage-signature"] ??
    h["x-nexmo-signature"] ??
    h["x-signature"] ??
    h["signature"] ??
    "";
  return typeof candidate === "string" ? candidate : "";
}

function firstString(...vals: any[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

function isWhatsApp(item: any): boolean {
  // Messages-API style payloads carry an explicit channel and nested message content.
  if (item?.channel === "whatsapp") return true;
  if (item?.message?.content) return true;
  if (typeof item?.message_uuid === "string") return true;
  return false;
}

function normalizeOne(item: any): NormalizedInboundMessage | null {
  if (!item || typeof item !== "object") return null;

  if (isWhatsApp(item)) {
    const body = firstString(
      item?.message?.content?.text,
      item?.text,
      item?.message?.text
    );
    return {
      channel: "whatsapp",
      // Messages API uses `from`; be tolerant of object form { number, ... }.
      fromAddress: firstString(item.from, item?.from?.number, item.msisdn),
      toAddress: firstString(item.to, item?.to?.number),
      body,
      externalId: firstString(item.message_uuid, item.messageId, item["message-id"]),
      raw: item,
    };
  }

  // Default: Vonage SMS inbound.
  return {
    channel: "sms",
    fromAddress: firstString(item.msisdn, item.from),
    toAddress: firstString(item.to),
    body: firstString(item.text, item.body),
    externalId: firstString(item.messageId, item["message-id"], item.message_uuid),
    raw: item,
  };
}

export const vonageProvider: InboundCommsProvider = {
  name: "vonage",

  verify(rawBody: Buffer, headers: Record<string, any>, secret: string): boolean {
    const signature = extractVonageSignature(headers);
    // Generic HMAC-SHA256 over the raw body. See TODO above re: real scheme.
    return verifyHmac(rawBody, signature, secret, "sha256");
  },

  parse(payload: any, _headers: Record<string, any>): NormalizedInboundMessage[] {
    if (payload == null) return [];

    // Some providers batch messages; accept a single object or an array, and
    // unwrap common envelope shapes defensively.
    let items: any[];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (Array.isArray(payload?.messages)) {
      items = payload.messages;
    } else if (Array.isArray(payload?.items)) {
      items = payload.items;
    } else {
      items = [payload];
    }

    const out: NormalizedInboundMessage[] = [];
    for (const item of items) {
      const normalized = normalizeOne(item);
      if (normalized && normalized.body) out.push(normalized);
    }
    return out;
  },
};
