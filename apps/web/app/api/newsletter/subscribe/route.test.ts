// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/newsletter/subscribe",
  { timeout: 20000 },
  () => {
    const createdEmails: string[] = [];

    afterEach(async () => {
      await prisma.newsletterSubscriber.deleteMany({
        where: { email: { in: createdEmails } },
      });
      createdEmails.length = 0;
    });

    it("returns 200 for a valid email", async () => {
      const { POST } = await import("./route");
      const email = `test-route-${crypto.randomUUID()}@example.com`;
      createdEmails.push(email);

      const response = await POST(
        new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      );
      const body = (await response.json()) as { ok: boolean };

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("returns 400 for a malformed email", async () => {
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          body: JSON.stringify({ email: "not-an-email" }),
        }),
      );

      expect(response.status).toBe(400);
    });
  },
);
