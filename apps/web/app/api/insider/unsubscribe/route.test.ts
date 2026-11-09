// @vitest-environment node
import { createInsiderLinkToken } from "@onwei/core";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SECRET = "test-insider-link-secret-0123456789abcdef";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insider/unsubscribe",
  { timeout: 20000 },
  () => {
    let entryId: string;

    beforeAll(async () => {
      process.env.INSIDER_LINK_SECRET = SECRET;
      const suffix = Math.floor(10000000 + Math.random() * 89999999);
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `test-insider-unsub-${crypto.randomUUID()}@example.test`,
          phone: `+9196${suffix}`,
          consentVersion: "test",
        },
      });
      entryId = row.id;
    });

    afterAll(async () => {
      await prisma.waitlistEntry.delete({ where: { id: entryId } });
    });

    async function post(token: string) {
      const { POST } = await import("./route");
      return POST(
        new Request(
          `http://localhost/api/insider/unsubscribe?t=${encodeURIComponent(token)}`,
          { method: "POST" },
        ),
      );
    }

    it("refuses an address link used as an unsubscribe link", async () => {
      const response = await post(
        createInsiderLinkToken("address", entryId, SECRET),
      );
      expect(response.status).toBe(403);
    });

    it("unsubscribes with a valid link, and again is still fine", async () => {
      const token = createInsiderLinkToken("unsubscribe", entryId, SECRET);
      expect((await post(token)).status).toBe(200);
      expect((await post(token)).status).toBe(200);
      const row = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      expect(row.unsubscribedAt).not.toBeNull();
    });
  },
);
