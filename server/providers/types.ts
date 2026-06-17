// [webhook] Provider-agnostic inbound messaging adapter contracts.
// Adding a new messaging provider (Twilio, ClickSend, ...) = implement these
// two interfaces in a new file + register it in registry.ts + set a config flag.

/**
 * A single inbound message, normalized into AutoProp's internal shape regardless
 * of which underlying messaging provider delivered it.
 */
export interface NormalizedInboundMessage {
  channel: "sms" | "whatsapp";
  fromAddress: string;
  toAddress: string;
  body: string;
  externalId: string;
  /** The original provider payload for this message, kept for agent learning. */
  raw: unknown;
}

/**
 * An inbound communications provider adapter. The webhook layer is written
 * entirely against this interface so the concrete provider is swappable.
 */
export interface InboundCommsProvider {
  /** Stable provider key, also used as the integrationSettings service name. */
  name: string;

  /**
   * Verify an inbound webhook request is authentic.
   * Must be defensive: return false on bad/missing input, never throw.
   * @param rawBody the exact raw request body bytes (pre-JSON-parse)
   * @param headers the request headers
   * @param secret the configured signing secret for this provider
   */
  verify(rawBody: Buffer, headers: Record<string, any>, secret: string): boolean;

  /**
   * Parse a (already JSON-parsed) provider payload into zero or more normalized
   * messages. Returns an array because some providers batch multiple messages
   * into a single webhook delivery.
   */
  parse(payload: any, headers: Record<string, any>): NormalizedInboundMessage[];
}
