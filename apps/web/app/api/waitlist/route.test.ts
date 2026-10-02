// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/waitlist",
  { timeout: 20000 },
  () => {
    const createdEmails: string[] = [];

    afterEach(async () => {
      await prisma.waitlistEntry.deleteMany({
        where: { email: { in: createdEmails } },
      });
      createdEmails.length = 0;
    });

    function fixtureBody(overrides: Record<string, unknown> = {}) {
      const email = `test-route-waitlist-${crypto.randomUUID()}@example.com`;
      createdEmails.push(email);
      const suffix = Math.floor(100000000 + Math.random() * 900000000);
      return {
        fullName: "Test User",
        email,
        phone: `9${suffix}`,
        consent: true,
        ...overrides,
      };
    }

    it("returns 400 CONSENT_REQUIRED and stores nothing without consent", async () => {
      const { POST } = await import("./route");
      const body = fixtureBody({ consent: undefined });

      const response = await POST(
        new Request("http://localhost/api/waitlist", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      const json = (await response.json()) as { reason: string };

      expect(response.status).toBe(400);
      expect(json.reason).toBe("CONSENT_REQUIRED");
      expect(
        await prisma.waitlistEntry.findUnique({ where: { email: body.email } }),
      ).toBeNull();
    });

    it("returns 200 and creates a row on the happy path", async () => {
      const { POST } = await import("./route");
      const body = fixtureBody();

      const response = await POST(
        new Request("http://localhost/api/waitlist", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      const data = (await response.json()) as {
        ok: boolean;
        alreadyJoined: boolean;
      };

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.alreadyJoined).toBe(false);

      const row = await prisma.waitlistEntry.findUnique({
        where: { email: body.email },
      });
      expect(row).not.toBeNull();
    });

    it("returns 400 for an invalid phone number", async () => {
      const { POST } = await import("./route");
      const body = fixtureBody({ phone: "123" });

      const response = await POST(
        new Request("http://localhost/api/waitlist", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      const data = (await response.json()) as { ok: boolean; reason: string };

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.reason).toBe("INVALID_PHONE");
    });

    it("pretends success without creating a row when the honeypot is filled", async () => {
      const { POST } = await import("./route");
      const body = fixtureBody({ company: "Definitely a bot" });

      const response = await POST(
        new Request("http://localhost/api/waitlist", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      const data = (await response.json()) as { ok: boolean };

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      const row = await prisma.waitlistEntry.findUnique({
        where: { email: body.email as string },
      });
      expect(row).toBeNull();
    });
  },
);
