// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it, vi } from "vitest";

process.env.OTP_HASH_SECRET ??= "test-otp-secret";

const sendSmsSignInCode = vi.fn(async () => true);

vi.mock("../../_lib/phoneCode", () => ({
  phoneCodeMode: async () => ({ mode: "sms" }),
  sendSmsSignInCode,
  sendWhatsAppCode: vi.fn(),
}));

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/auth/request-otp by SMS",
  { timeout: 20000 },
  () => {
    const phones: string[] = [];

    afterEach(async () => {
      await prisma.otpChallenge.deleteMany({
        where: { identifier: { in: phones } },
      });
      phones.length = 0;
    });

    async function request(phone: string) {
      const { POST } = await import("./route");
      phones.push(phone);
      return POST(
        new Request("http://localhost/api/auth/request-otp", {
          method: "POST",
          body: JSON.stringify({ identifier: phone, channel: "SMS" }),
        }),
      );
    }

    it("sends a real random code by SMS", async () => {
      sendSmsSignInCode.mockResolvedValueOnce(true);
      const phone = `+9190003${String(Date.now()).slice(-5)}`;
      const response = await request(phone);
      expect(response.status).toBe(200);
      const [, code] = sendSmsSignInCode.mock.calls.at(-1) as unknown as [
        string,
        string,
      ];
      expect(code).toMatch(/^\d{6}$/);
      expect(JSON.stringify(await response.json())).not.toContain(code);
    });

    it("says so when the text didn't send", async () => {
      sendSmsSignInCode.mockResolvedValueOnce(false);
      const phone = `+9190004${String(Date.now()).slice(-5)}`;
      const response = await request(phone);
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        ok: false,
        reason: "SMS_SEND_FAILED",
      });
    });
  },
);
