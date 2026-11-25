// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

// Test rows only (example.test email, fake name), removed afterwards. Only
// "Save" is exercised here, so nothing is sent to iThink.
describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/insiders/addresses/[id]/details",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    let entryId: string;
    let addressId: string;

    beforeAll(async () => {
      const email = `test-route-superadmin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = email;
      const staffUser = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Admin" },
      });
      staffUserId = staffUser.id;
      const token = await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${token}`;
      const entry = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `address-route-${crypto.randomUUID()}@example.test`,
          phone: "+919876543210",
          consentVersion: "test",
        },
      });
      entryId = entry.id;
      const address = await prisma.insiderCardAddress.create({
        data: {
          waitlistEntryId: entry.id,
          fullName: "Test Insider",
          phone: "+919876543210",
          line1: "14 Test Road",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500032",
        },
      });
      addressId = address.id;
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { entityId: addressId } });
      await prisma.waitlistEntry.delete({ where: { id: entryId } });
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    async function patch(body: Record<string, unknown>) {
      const { PATCH } = await import("./route");
      return PATCH(
        new Request(
          `http://localhost/api/insiders/addresses/${addressId}/details`,
          {
            method: "PATCH",
            headers: { cookie: cookieHeader },
            body: JSON.stringify(body),
          },
        ),
        { params: Promise.resolve({ id: addressId }) },
      );
    }

    const address = {
      fullName: "Test Insider",
      phone: "9876543210",
      line1: "20 Fixed Road",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
    };

    it("saves a fixed address", async () => {
      const response = await patch(address);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        message: "Address saved.",
      });
      const saved = await prisma.insiderCardAddress.findUniqueOrThrow({
        where: { id: addressId },
      });
      expect(saved).toMatchObject({
        line1: "20 Fixed Road",
        postalCode: "500081",
      });
    });

    it("refuses a wrong PIN code and names the field", async () => {
      const response = await patch({ ...address, postalCode: "0123" });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        fields: ["postalCode"],
      });
    });
  },
);
