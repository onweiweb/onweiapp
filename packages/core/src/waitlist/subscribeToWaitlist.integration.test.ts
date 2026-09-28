import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import { subscribeToWaitlist } from "./subscribeToWaitlist";

describe.skipIf(!process.env.DATABASE_URL)(
  "subscribeToWaitlist (integration)",
  { timeout: 20000 },
  () => {
    const createdEmails: string[] = [];

    afterEach(async () => {
      await prisma.waitlistEntry.deleteMany({
        where: { email: { in: createdEmails } },
      });
      createdEmails.length = 0;
    });

    function randomIndianMobile() {
      const suffix = Math.floor(100000000 + Math.random() * 900000000);
      return `9${suffix}`;
    }

    function fixture(
      overrides: Partial<Parameters<typeof subscribeToWaitlist>[0]> = {},
    ) {
      const email = `test-waitlist-${randomUUID()}@example.com`;
      createdEmails.push(email);
      return {
        fullName: "Test User",
        email,
        phone: randomIndianMobile(),
        consentVersion: "2026-09-01",
        ...overrides,
      };
    }

    it("creates a new entry for a new email + phone", async () => {
      const input = fixture();

      const result = await subscribeToWaitlist(input);

      expect(result).toEqual({ ok: true, alreadyJoined: false });
      const row = await prisma.waitlistEntry.findUnique({
        where: { email: input.email },
      });
      expect(row).not.toBeNull();
      expect(row?.phone).toBe(`+91${input.phone}`);
    });

    it("rejects an invalid name", async () => {
      const result = await subscribeToWaitlist(fixture({ fullName: "A" }));
      expect(result).toEqual({ ok: false, reason: "INVALID_NAME" });
    });

    it("rejects an invalid email", async () => {
      const result = await subscribeToWaitlist(
        fixture({ email: "not-an-email" }),
      );
      expect(result).toEqual({ ok: false, reason: "INVALID_EMAIL" });
    });

    it("rejects an invalid phone number", async () => {
      const result = await subscribeToWaitlist(fixture({ phone: "123" }));
      expect(result).toEqual({ ok: false, reason: "INVALID_PHONE" });
    });

    it("reports alreadyJoined for the identical email+phone pair", async () => {
      const input = fixture();
      await subscribeToWaitlist(input);

      const result = await subscribeToWaitlist(input);

      expect(result).toEqual({ ok: true, alreadyJoined: true });
      const rows = await prisma.waitlistEntry.findMany({
        where: { email: input.email },
      });
      expect(rows).toHaveLength(1);
    });

    it("rejects a phone already used by a different email", async () => {
      const first = fixture();
      await subscribeToWaitlist(first);
      const second = fixture({ phone: first.phone });

      const result = await subscribeToWaitlist(second);

      expect(result).toEqual({ ok: false, reason: "DUPLICATE_PHONE" });
    });

    it("rejects an email already used by a different phone", async () => {
      const first = fixture();
      await subscribeToWaitlist(first);
      const second = fixture({ email: first.email });
      createdEmails.push(first.email);

      const result = await subscribeToWaitlist(second);

      expect(result).toEqual({ ok: false, reason: "DUPLICATE_EMAIL" });
    });

    it("clamps an out-of-range movementFlex instead of rejecting the signup", async () => {
      const input = fixture({ movementFlex: 500 });

      const result = await subscribeToWaitlist(input);

      expect(result).toEqual({ ok: true, alreadyJoined: false });
      const row = await prisma.waitlistEntry.findUnique({
        where: { email: input.email },
      });
      expect(row?.movementFlex).toBe(100);
    });
  },
);
