import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import {
  requestOtpChallenge,
  verifyOtpAndAuthenticate,
  verifyOtpChallenge,
} from "./otpChallenge";

const SECRET = "test-otp-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "otpChallenge (integration)",
  { timeout: 20000 },
  () => {
    const createdIdentifiers: string[] = [];

    afterEach(async () => {
      await prisma.otpChallenge.deleteMany({
        where: { identifier: { in: createdIdentifiers } },
      });
      await prisma.customer.deleteMany({
        where: { email: { in: createdIdentifiers } },
      });
      createdIdentifiers.length = 0;
    });

    function fixtureEmail() {
      const email = `test-otp-${randomUUID()}@example.com`;
      createdIdentifiers.push(email);
      return email;
    }

    it("creates a challenge with a ~10 minute expiry and a hash that isn't the plaintext code", async () => {
      const identifier = fixtureEmail();

      const result = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );

      expect(result.code).toMatch(/^\d{6}$/);
      const minutesOut = (result.expiresAt.getTime() - Date.now()) / 60000;
      expect(minutesOut).toBeGreaterThan(9);
      expect(minutesOut).toBeLessThanOrEqual(10);

      const row = await prisma.otpChallenge.findUniqueOrThrow({
        where: { id: result.challengeId },
      });
      expect(row.codeHash).not.toBe(result.code);
    });

    it("consumes the challenge on a correct code within expiry", async () => {
      const identifier = fixtureEmail();
      const { code } = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );

      const result = await verifyOtpChallenge(
        { identifier, purpose: "LOGIN", code },
        SECRET,
      );

      expect(result.ok).toBe(true);
      const rows = await prisma.otpChallenge.findMany({
        where: { identifier },
      });
      expect(rows[0]?.consumedAt).not.toBeNull();
    });

    it("increments attempts on an incorrect code and doesn't consume the challenge", async () => {
      const identifier = fixtureEmail();
      await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );

      const result = await verifyOtpChallenge(
        { identifier, purpose: "LOGIN", code: "000000" },
        SECRET,
      );

      expect(result).toEqual({ ok: false, reason: "INCORRECT_CODE" });
      const rows = await prisma.otpChallenge.findMany({
        where: { identifier },
      });
      expect(rows[0]?.attempts).toBe(1);
      expect(rows[0]?.consumedAt).toBeNull();
    });

    it("rejects even the correct code once maxAttempts is reached", async () => {
      const identifier = fixtureEmail();
      const { code } = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );

      for (let i = 0; i < 5; i++) {
        await verifyOtpChallenge(
          { identifier, purpose: "LOGIN", code: "000000" },
          SECRET,
        );
      }
      const result = await verifyOtpChallenge(
        { identifier, purpose: "LOGIN", code },
        SECRET,
      );

      expect(result).toEqual({ ok: false, reason: "MAX_ATTEMPTS_EXCEEDED" });
    });

    it("rejects an expired challenge even with the correct code", async () => {
      const identifier = fixtureEmail();
      const { code } = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );
      await prisma.otpChallenge.updateMany({
        where: { identifier },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const result = await verifyOtpChallenge(
        { identifier, purpose: "LOGIN", code },
        SECRET,
      );

      expect(result).toEqual({ ok: false, reason: "EXPIRED" });
    });

    it("creates a Customer on first login and reuses it on repeat login", async () => {
      const identifier = fixtureEmail();
      const first = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );
      const firstAuth = await verifyOtpAndAuthenticate(
        { identifier, purpose: "LOGIN", code: first.code, channel: "EMAIL" },
        SECRET,
      );
      expect(firstAuth.ok).toBe(true);
      const customerId = firstAuth.ok ? firstAuth.customerId : undefined;
      expect(customerId).toBeDefined();

      const second = await requestOtpChallenge(
        { identifier, channel: "EMAIL", purpose: "LOGIN" },
        SECRET,
      );
      const secondAuth = await verifyOtpAndAuthenticate(
        { identifier, purpose: "LOGIN", code: second.code, channel: "EMAIL" },
        SECRET,
      );

      expect(secondAuth.ok).toBe(true);
      expect(secondAuth.ok && secondAuth.customerId).toBe(customerId);

      const customer = await prisma.customer.findUnique({
        where: { email: identifier },
      });
      expect(customer?.emailVerifiedAt).not.toBeNull();
    });
  },
);
