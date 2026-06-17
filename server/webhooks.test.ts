import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyHmac } from "./_core/hmac";
import { vonageProvider } from "./providers/vonage";

const SECRET = "test-signature-secret";

function hmacHex(body: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyHmac", () => {
  it("accepts a valid signature over the raw body", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const sig = hmacHex(body, SECRET);
    expect(verifyHmac(body, sig, SECRET)).toBe(true);
  });

  it("rejects when the body has been tampered with", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const sig = hmacHex(body, SECRET);
    const tampered = Buffer.from(JSON.stringify({ hello: "evil" }));
    expect(verifyHmac(tampered, sig, SECRET)).toBe(false);
  });

  it("fails safely on an empty signature", () => {
    const body = Buffer.from("anything");
    expect(verifyHmac(body, "", SECRET)).toBe(false);
  });

  it("fails safely on a missing secret", () => {
    const body = Buffer.from("anything");
    const sig = hmacHex(body, SECRET);
    expect(verifyHmac(body, sig, "")).toBe(false);
  });
});

describe("vonageProvider.parse", () => {
  it("normalizes a Vonage SMS inbound payload", () => {
    const payload = {
      msisdn: "447700900001",
      to: "447700900999",
      text: "There is a leak in the kitchen",
      messageId: "0A00000012345678",
    };

    const msgs = vonageProvider.parse(payload, {});
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      channel: "sms",
      fromAddress: "447700900001",
      toAddress: "447700900999",
      body: "There is a leak in the kitchen",
      externalId: "0A00000012345678",
    });
    expect(msgs[0].raw).toBe(payload);
  });

  it("normalizes a Vonage Messages-API WhatsApp payload", () => {
    const payload = {
      channel: "whatsapp",
      from: "447700900001",
      to: "447700900999",
      message_uuid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      message: {
        content: {
          type: "text",
          text: "Hi, when is my inspection?",
        },
      },
    };

    const msgs = vonageProvider.parse(payload, {});
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      channel: "whatsapp",
      fromAddress: "447700900001",
      toAddress: "447700900999",
      body: "Hi, when is my inspection?",
      externalId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
  });
});
