// @vitest-environment node
//
// jose's HS256 signing does an `instanceof Uint8Array` check on its key
// material; under jsdom's environment that check fails against Node's
// native Uint8Array (a cross-realm instanceof mismatch), even though the
// value is structurally correct. Route handlers run in Node at runtime
// anyway, so this file's tests should too.
import { requestOtpChallenge } from "@onwei/core";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";

process.env.OTP_HASH_SECRET ??= "test-otp-secret";
process.env.SESSION_JWT_SECRET ??= "test-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/auth/verify-otp",
  { timeout: 20000 },
  () => {
    const createdIdentifiers: string[] = [];

    afterEach(async () => {
      await prisma.otpChallenge.deleteMany({
        where: { identifier: { in: createdIdentifiers } },
      });
      await prisma.consentLog.deleteMany({
        where: { customer: { email: { in: createdIdentifiers } } },
      });
      await prisma.customer.deleteMany({
        where: { email: { in: createdIdentifiers } },
      });
      createdIdentifiers.length = 0;
    });

    function fixtureEmail() {
      const email = `test-route-${crypto.randomUUID()}@example.com`;
      createdIdentifiers.push(email);
      return email;
    }

    it("returns 200 and sets a session cookie on the happy path", async () => {
      const { POST } = await import("./route");
      const identifier = fixtureEmail();
      const { code } = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        process.env.OTP_HASH_SECRET!,
      );

      const response = await POST(
        new Request("http://localhost/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            identifier,
            channel: "EMAIL",
            code,
            consent: true,
          }),
        }),
      );
      const body = (await response.json()) as { ok: boolean };

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(response.headers.get("set-cookie")).toMatch(/onwei_session=/);
      const logs = await prisma.consentLog.findMany({
        where: { customer: { email: identifier } },
      });
      expect(logs).toHaveLength(2);
    });

    it("returns 400 CONSENT_REQUIRED and creates no account without consent", async () => {
      const { POST } = await import("./route");
      const identifier = fixtureEmail();
      const { code } = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        process.env.OTP_HASH_SECRET!,
      );

      const response = await POST(
        new Request("http://localhost/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ identifier, channel: "EMAIL", code }),
        }),
      );
      const body = (await response.json()) as { reason: string };

      expect(response.status).toBe(400);
      expect(body.reason).toBe("CONSENT_REQUIRED");
      expect(
        await prisma.customer.findUnique({ where: { email: identifier } }),
      ).toBeNull();
    });

    it("returns 400 without leaking attempts/hash details on an incorrect code", async () => {
      const { POST } = await import("./route");
      const identifier = fixtureEmail();
      await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        process.env.OTP_HASH_SECRET!,
      );

      const response = await POST(
        new Request("http://localhost/api/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({
            identifier,
            channel: "EMAIL",
            code: "000000",
            consent: true,
          }),
        }),
      );
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(400);
      expect(body.reason).toBe("INCORRECT_CODE");
      expect(body).not.toHaveProperty("attempts");
      expect(body).not.toHaveProperty("codeHash");
    });
  },
);
