// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it, vi } from "vitest";

process.env.OTP_HASH_SECRET ??= "test-otp-secret";

const sendWhatsAppCode = vi.fn(async () => true);

vi.mock("../../_lib/phoneCode", () => ({
  phoneCodeMode: async () => ({ mode: "whatsapp" }),
  sendSmsSignInCode: vi.fn(),
  sendWhatsAppCode,
}));

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/auth/request-otp by WhatsApp",
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
          body: JSON.stringify({ identifier: phone, channel: "WHATSAPP" }),
        }),
      );
    }

    it("sends a real random code on WhatsApp", async () => {
      sendWhatsAppCode.mockResolvedValueOnce(true);
      const phone = `+9190000${String(Date.now()).slice(-5)}`;
      const response = await request(phone);
      expect(response.status).toBe(200);
      const [, code] = sendWhatsAppCode.mock.calls.at(-1) as unknown as [
        string,
        string,
      ];
      expect(code).toMatch(/^\d{6}$/);
      const body = JSON.stringify(await response.json());
      expect(body).not.toContain(code);
    });

    it("says so when WhatsApp didn't send", async () => {
      sendWhatsAppCode.mockResolvedValueOnce(false);
      const phone = `+9190001${String(Date.now()).slice(-5)}`;
      const response = await request(phone);
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        ok: false,
        reason: "WHATSAPP_SEND_FAILED",
      });
    });
  },
);
