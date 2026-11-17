import { prisma } from "@onwei/database";
import { afterAll, describe, expect, it } from "vitest";
import { listSmsMessages } from "./messageLog";
import { sendSmsCode } from "./send";
import { applyMsg91Report } from "./webhook";

const config = { authKey: "test-key", templateId: "tpl-1" };

describe.skipIf(!process.env.DATABASE_URL)(
  "SMS sends (dev DB)",
  { timeout: 30000 },
  () => {
    // Test numbers in a range no real customer has.
    const phone = `+9190002${String(Date.now()).slice(-5)}`;
    const requestId = `test-${Date.now()}`;

    afterAll(async () => {
      await prisma.smsMessage.deleteMany({ where: { phone } });
    });

    it("logs a send without the code, then applies delivery", async () => {
      const result = await sendSmsCode(
        { phone, code: "482913", expiryMinutes: 10 },
        {
          config,
          fetchImpl: async () =>
            new Response(
              JSON.stringify({ type: "success", request_id: requestId }),
            ),
        },
      );
      expect(result).toEqual({ status: "sent", requestId });
      const row = await prisma.smsMessage.findUniqueOrThrow({
        where: { providerRequestId: requestId },
      });
      expect(row).toMatchObject({ phone, status: "SENT" });
      expect(JSON.stringify(row)).not.toContain("482913");

      const at = new Date();
      expect(
        await applyMsg91Report({ requestId, status: "DELIVERED", at }),
      ).toBe(true);
      // A late "failed" can't undo delivered.
      expect(await applyMsg91Report({ requestId, status: "FAILED", at })).toBe(
        false,
      );

      const { rows } = await listSmsMessages({
        page: 1,
        pageSize: 5,
        phoneEnding: phone.slice(-5),
      });
      expect(rows[0]).toMatchObject({ status: "DELIVERED" });
      expect(rows[0]!.phone).not.toBe(phone);
    });

    it("logs a failed send with MSG91's reason", async () => {
      const result = await sendSmsCode(
        { phone, code: "111111", expiryMinutes: 10 },
        {
          config,
          fetchImpl: async () =>
            new Response(
              JSON.stringify({ type: "error", message: "Invalid template" }),
              { status: 400 },
            ),
        },
      );
      expect(result).toMatchObject({ status: "failed" });
      const failed = await prisma.smsMessage.findFirst({
        where: { phone, status: "FAILED" },
      });
      expect(failed?.failureReason).toBe("MSG91 said 400: Invalid template");
    });

    it("skips quietly when MSG91 isn't set up", async () => {
      expect(
        await sendSmsCode(
          { phone, code: "1", expiryMinutes: 10 },
          { config: null },
        ),
      ).toEqual({ status: "skipped" });
    });
  },
);
