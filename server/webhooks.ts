import type { Express, Request, Response } from "express";
import * as db from "./db";
import { ENV } from "./_core/env";
import { getActiveInboundProvider } from "./providers/registry";
import type { NormalizedInboundMessage } from "./providers/types";
import { handleIncomingSMS, handleIncomingWhatsApp } from "./ticket-automation";

/**
 * [webhook] Provider-agnostic inbound communications webhooks.
 *
 * Routes mirror the registerOAuthRoutes(app) pattern. The concrete messaging
 * provider is resolved at request time via getActiveInboundProvider(), so SMS
 * and WhatsApp ingestion stays portable across providers.
 */

/**
 * Resolve the signing secret for a provider. Prefer the per-provider integration
 * setting (configData.webhookSecret), fall back to the generic env secret.
 */
async function loadWebhookSecret(providerName: string): Promise<string> {
  try {
    // getIntegrationSetting is typed to the integrationSettings.service enum;
    // provider names are registered there ("vonage"). Cast keeps it portable.
    const setting = await db.getIntegrationSetting(providerName as any);
    if (setting && (setting as any).configData) {
      const parsed = JSON.parse((setting as any).configData);
      if (parsed && typeof parsed.webhookSecret === "string" && parsed.webhookSecret) {
        return parsed.webhookSecret;
      }
    }
  } catch (err) {
    console.error("[Webhooks] Failed to load integration secret", err);
  }
  // Generic per-provider env fallback.
  return ENV.vonageWebhookSecret || "";
}

async function persistAndDispatch(msg: NormalizedInboundMessage): Promise<void> {
  // Persist the raw payload in metadata for future agent learning.
  await db.createCommunication({
    channel: msg.channel,
    direction: "inbound",
    fromAddress: msg.fromAddress,
    toAddress: msg.toAddress,
    body: msg.body,
    externalId: msg.externalId,
    metadata: JSON.stringify(msg.raw),
  });

  // Feed the EXISTING auto-ticket/triage pipeline.
  if (msg.channel === "sms") {
    await handleIncomingSMS({
      from: msg.fromAddress,
      to: msg.toAddress,
      body: msg.body,
      messageId: msg.externalId,
    });
  } else {
    await handleIncomingWhatsApp({
      from: msg.fromAddress,
      to: msg.toAddress,
      body: msg.body,
      messageId: msg.externalId,
    });
  }
}

function makeHandler(expectedChannel: "sms" | "whatsapp") {
  return async (req: Request, res: Response) => {
    try {
      const provider = getActiveInboundProvider();
      const secret = await loadWebhookSecret(provider.name);
      const rawBody: Buffer = (req as any).rawBody;

      if (secret) {
        if (!provider.verify(rawBody, req.headers as Record<string, any>, secret)) {
          return res.status(401).json({ error: "invalid signature" });
        }
      } else {
        // [webhook] Fail CLOSED: no signing secret => reject. Accepting unverified
        // inbound would let anyone POST fake tenant messages into the ticket
        // pipeline. Unverified acceptance is allowed ONLY via an explicit dev flag
        // and never in production.
        const devBypass =
          ENV.allowUnverifiedWebhooks && process.env.NODE_ENV !== "production";
        if (!devBypass) {
          console.error(
            `[Webhooks] No signing secret configured for provider "${provider.name}" — REJECTING ${expectedChannel} webhook (fail closed). Provision a secret, or set ALLOW_UNVERIFIED_WEBHOOKS=true in a non-production environment.`
          );
          return res.status(503).json({ error: "webhook signing not configured" });
        }
        console.warn(
          `[Webhooks] DEV BYPASS: accepting ${expectedChannel} webhook UNVERIFIED via ALLOW_UNVERIFIED_WEBHOOKS. Never use this in production.`
        );
      }

      const msgs = provider.parse(req.body, req.headers as Record<string, any>);
      for (const msg of msgs) {
        await persistAndDispatch(msg);
      }

      // Return 200 fast so the provider does not retry.
      return res.status(200).json({ ok: true, received: msgs.length });
    } catch (err) {
      console.error(`[Webhooks] Failed to process ${expectedChannel} webhook`, err);
      return res.status(200).json({ ok: false });
    }
  };
}

export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/sms", makeHandler("sms"));
  app.post("/api/webhooks/whatsapp", makeHandler("whatsapp"));
}
