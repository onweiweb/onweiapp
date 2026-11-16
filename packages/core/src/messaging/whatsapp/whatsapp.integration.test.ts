import { prisma, type WhatsAppPurpose } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendWhatsApp } from "./send";
import { applyGupshupStatus, recordWhatsAppOptOut } from "./webhook";

const config = {
  apiKey: "test-key",
  appName: "TestApp",
  sourceNumber: "919000000000",
};

/** A fake Gupshup that accepts every send. */
function acceptingFetch(messageId: string): typeof fetch {
  return async () =>
    new Response(JSON.stringify({ status: "submitted", messageId }), {
      status: 202,
    });
}

describe.skipIf(!process.env.DATABASE_URL)(
  "WhatsApp sends (dev DB)",
  { timeout: 30000 },
  () => {
    const purposes: WhatsAppPurpose[] = ["SIGN_IN_CODE", "WAITLIST_JOINED"];
    // Test numbers in a range no real customer has.
    const phone = `+9190000${String(Date.now()).slice(-5)}`;
    let saved: Awaited<ReturnType<typeof prisma.whatsAppTemplate.findMany>> =
      [];

    beforeAll(async () => {
      saved = await prisma.whatsAppTemplate.findMany({
        where: { purpose: { in: purposes } },
      });
      await prisma.whatsAppTemplate.deleteMany({
        where: { purpose: { in: purposes } },
      });
      await prisma.whatsAppTemplate.createMany({
        data: [
          {
            purpose: "SIGN_IN_CODE",
            gupshupTemplateId: "tpl-sign-in",
            variables: ["code"],
            isActive: true,
          },
          {
            purpose: "WAITLIST_JOINED",
            gupshupTemplateId: "tpl-waitlist",
            variables: ["firstName"],
            headerType: "IMAGE",
            headerImageUrl: "https://blob.example/w.jpg",
            isActive: true,
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.whatsAppMessage.deleteMany({ where: { phone } });
      await prisma.whatsAppOptOut.deleteMany({ where: { phone } });
      await prisma.whatsAppTemplate.deleteMany({
        where: { purpose: { in: purposes } },
      });
      if (saved.length > 0) {
        await prisma.whatsAppTemplate.createMany({ data: saved });
      }
    });

    it("logs a sent message and moves it forward on delivery updates", async () => {
      const messageId = `m-${crypto.randomUUID()}`;
      const result = await sendWhatsApp(
        {
          purpose: "WAITLIST_JOINED",
          phone,
          values: { firstName: "Test" },
        },
        { config, fetchImpl: acceptingFetch(messageId) },
      );
      expect(result).toEqual({ status: "sent", messageId });

      const row = await prisma.whatsAppMessage.findUniqueOrThrow({
        where: { providerMessageId: messageId },
      });
      expect(row.status).toBe("SENT");

      const at = new Date();
      expect(
        await applyGupshupStatus({
          kind: "status",
          ids: [messageId],
          status: "READ",
          at,
        }),
      ).toBe(true);
      // A late "delivered" never moves it back.
      expect(
        await applyGupshupStatus({
          kind: "status",
          ids: [messageId],
          status: "DELIVERED",
          at,
        }),
      ).toBe(false);
      const after = await prisma.whatsAppMessage.findUniqueOrThrow({
        where: { providerMessageId: messageId },
      });
      expect(after.status).toBe("READ");
    });

    it("logs a failed send with the reason", async () => {
      const result = await sendWhatsApp(
        { purpose: "SIGN_IN_CODE", phone, values: { code: "123456" } },
        {
          config,
          fetchImpl: async () =>
            new Response(JSON.stringify({ message: "Bad template" }), {
              status: 400,
            }),
        },
      );
      expect(result).toEqual({
        status: "failed",
        reason: "Gupshup said 400: Bad template",
      });
      const row = await prisma.whatsAppMessage.findFirstOrThrow({
        where: { phone, purpose: "SIGN_IN_CODE", status: "FAILED" },
      });
      expect(row.failureReason).toBe("Gupshup said 400: Bad template");
    });

    it("skips when not connected or the template is off", async () => {
      expect(
        await sendWhatsApp(
          { purpose: "SIGN_IN_CODE", phone, values: { code: "1" } },
          { config: null },
        ),
      ).toEqual({ status: "skipped", reason: "NOT_CONFIGURED" });
      expect(
        await sendWhatsApp(
          { purpose: "INSIDER_CODE", phone, values: {} },
          { config, fetchImpl: acceptingFetch("never") },
        ),
      ).toMatchObject({ status: "skipped", reason: "TEMPLATE_OFF" });
    });

    it("STOP blocks waitlist messages but not sign-in codes", async () => {
      await recordWhatsAppOptOut(phone);
      expect(
        await sendWhatsApp(
          { purpose: "WAITLIST_JOINED", phone, values: { firstName: "T" } },
          { config, fetchImpl: acceptingFetch(`m-${crypto.randomUUID()}`) },
        ),
      ).toEqual({ status: "skipped", reason: "OPTED_OUT" });
      const code = await sendWhatsApp(
        { purpose: "SIGN_IN_CODE", phone, values: { code: "654321" } },
        { config, fetchImpl: acceptingFetch(`m-${crypto.randomUUID()}`) },
      );
      expect(code.status).toBe("sent");
    });
  },
);
