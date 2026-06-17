import { ENV } from "../_core/env";
import type { InboundCommsProvider } from "./types";
import { vonageProvider } from "./vonage";

/**
 * [webhook] Provider swap point.
 *
 * To add another inbound messaging provider later (Twilio, ClickSend, ...):
 *   1. Create server/providers/<name>.ts implementing InboundCommsProvider.
 *   2. Add one line here mapping its key -> the exported adapter.
 *   3. Set ACTIVE_SMS_PROVIDER=<name> in the environment.
 * No webhook handler code needs to change.
 */
const PROVIDERS: Record<string, InboundCommsProvider> = {
  vonage: vonageProvider,
};

/**
 * Returns the currently-active inbound provider based on ENV.activeSmsProvider
 * (default "vonage"). Throws a clear error if the configured provider is unknown.
 */
export function getActiveInboundProvider(): InboundCommsProvider {
  const key = (ENV.activeSmsProvider || "vonage").toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(
      `[Webhooks] Unknown inbound provider "${key}". Available: ${Object.keys(
        PROVIDERS
      ).join(", ")}. Set ACTIVE_SMS_PROVIDER to a registered provider.`
    );
  }
  return provider;
}
