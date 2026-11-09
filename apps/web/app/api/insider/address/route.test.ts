// @vitest-environment node
import { createInsiderLinkToken } from "@onwei/core";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SECRET = "test-insider-link-secret-0123456789abcdef";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insider/address",
  { timeout: 20000 },
  () => {
    let entryId: string;

    beforeAll(async () => {
      process.env.INSIDER_LINK_SECRET = SECRET;
      const suffix = Math.floor(10000000 + Math.random() * 89999999);
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `test-insider-address-${crypto.randomUUID()}@example.test`,
          phone: `+9197${suffix}`,
          consentVersion: "test",
        },
      });
      entryId = row.id;
    });

    afterAll(async () => {
      await prisma.waitlistEntry.delete({ where: { id: entryId } });
    });

    function post(body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/insider/address", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    const address = {
      fullName: "Test Insider",
      phone: "9876543210",
      line1: "14 Hill Road",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400050",
    };

    it("saves the address for a valid link", async () => {
      const token = createInsiderLinkToken("address", entryId, SECRET);
      const response = await post({ token, ...address });
      expect(response.status).toBe(200);
      const row = await prisma.insiderCardAddress.findUnique({
        where: { waitlistEntryId: entryId },
      });
      expect(row?.postalCode).toBe("400050");
    });

    it("refuses a forged or wrong-purpose link", async () => {
      const wrong = createInsiderLinkToken("unsubscribe", entryId, SECRET);
      const response = await post({ token: wrong, ...address });
      expect(response.status).toBe(403);
      expect(((await response.json()) as { reason: string }).reason).toBe(
        "LINK_INVALID",
      );
    });

    it("names the fields that need fixing", async () => {
      const token = createInsiderLinkToken("address", entryId, SECRET);
      const response = await post({ token, ...address, postalCode: "12" });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        reason: "INVALID_FIELDS",
        fields: ["postalCode"],
      });
    });
  },
);
