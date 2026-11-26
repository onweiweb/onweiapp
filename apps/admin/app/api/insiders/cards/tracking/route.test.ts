// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

// Test rows only (example.test email, fake name), removed afterwards.
// iThink is faked (test-server mode): nothing leaves this machine.
describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/insiders/cards/tracking",
  { timeout: 60000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    let entryId: string;
    let addressId: string;
    let shipmentId: string;
    const reference = `CARD-T${Date.now()}`;
    const awb = String(Date.now() * 10 + 3);

    beforeAll(async () => {
      vi.stubEnv("ITHINK_ENV", "staging");
      vi.stubEnv("ITHINK_ACCESS_TOKEN", "test");
      vi.stubEnv("ITHINK_SECRET_KEY", "test");
      vi.stubEnv("ITHINK_PICKUP_ADDRESS_ID", "1");
      // The test server's Order Details knows this one parcel.
      vi.stubGlobal("fetch", async (url: string) => {
        const body = String(url).includes("get_details")
          ? { data: { [awb]: { awb_no: awb, order: reference } } }
          : {};
        return new Response(JSON.stringify(body), { status: 200 });
      });

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
          email: `tracking-route-${crypto.randomUUID()}@example.test`,
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
      const shipment = await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: address.id,
          reference,
          status: "FAILED",
          error: "iThink said: Order No. Already Exist.",
        },
      });
      shipmentId = shipment.id;
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      await prisma.auditLog.deleteMany({ where: { entityId: shipmentId } });
      // The address and shipment go with the entry (cascade).
      await prisma.waitlistEntry.delete({ where: { id: entryId } });
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    async function post(body: Record<string, unknown>) {
      const { POST } = await import("./route");
      return POST(
        new Request("http://localhost/api/insiders/cards/tracking", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({}) },
      );
    }

    it("says so when nothing that looks like a tracking number was pasted", async () => {
      const response = await post({ text: "CARD-0059 today ₹1.00" });
      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toContain("No tracking numbers found");
      expect(
        await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } }),
      ).toMatchObject({ status: "FAILED", awb: null });
    });

    it("matches a pasted tracking number to its card", async () => {
      const response = await post({ text: `${reference}\t${awb}`, addressId });
      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        ok: boolean;
        matched: { awb: string }[];
        message: string;
      };
      expect(json).toMatchObject({ ok: true, matched: [{ awb }] });
      expect(json.message).toContain("1 card now shows as booked");
      expect(
        await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } }),
      ).toMatchObject({ status: "BOOKED", awb, error: null });
    });
  },
);
