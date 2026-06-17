import crypto from "crypto";

/**
 * [webhook] Generic HMAC signature verification helper.
 *
 * Computes HMAC(algo, secret) over the raw request body and compares it against
 * the provided signature using a constant-time comparison. Length-guarded and
 * fully defensive: returns false on any bad/missing input and never throws.
 *
 * The `signature` may be hex or base64 encoded; both are attempted.
 */
export function verifyHmac(
  rawBody: Buffer,
  signature: string,
  secret: string,
  algo: string = "sha256"
): boolean {
  try {
    if (!Buffer.isBuffer(rawBody)) return false;
    if (typeof signature !== "string" || signature.length === 0) return false;
    if (typeof secret !== "string" || secret.length === 0) return false;

    const computed = crypto.createHmac(algo, secret).update(rawBody).digest();

    // Try to interpret the incoming signature as hex, then base64. Compare each
    // candidate with timingSafeEqual but only when byte lengths match (the
    // function throws on length mismatch, which would leak timing/throw).
    const candidates: Buffer[] = [];
    if (/^[0-9a-fA-F]+$/.test(signature) && signature.length % 2 === 0) {
      candidates.push(Buffer.from(signature, "hex"));
    }
    try {
      candidates.push(Buffer.from(signature, "base64"));
    } catch {
      // ignore malformed base64
    }

    for (const candidate of candidates) {
      if (
        candidate.length === computed.length &&
        crypto.timingSafeEqual(candidate, computed)
      ) {
        return true;
      }
    }
    return false;
  } catch {
    // Never throw out of a verification path.
    return false;
  }
}
