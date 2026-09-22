// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/dsr/[id]/status",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdRequestIds: string[] = [];
    const createdCustomerIds: string[] = [];

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
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: createdRequestIds } },
      });
      await prisma.dataSubjectRequest.deleteMany({
        where: { id: { in: createdRequestIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      createdRequestIds.length = 0;
      createdCustomerIds.length = 0;
    });

    async function createFixtureRequest() {
      const customer = await prisma.customer.create({
        data: { email: `test-customer-${crypto.randomUUID()}@example.com` },
      });
      createdCustomerIds.push(customer.id);
      const request = await prisma.dataSubjectRequest.create({
        data: { customerId: customer.id, type: "ACCESS" },
      });
      createdRequestIds.push(request.id);
      return request;
    }

    it("returns 401 with no session", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request("http://localhost/api/dsr/x/status", {
          method: "PATCH",
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        }),
        { params: Promise.resolve({ id: "x" }) },
      );
      expect(response.status).toBe(401);
    });

    it("updates the status on the happy path", async () => {
      const request = await createFixtureRequest();
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/dsr/${request.id}/status`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        }),
        { params: Promise.resolve({ id: request.id }) },
      );
      const body = (await response.json()) as { request: { status: string } };

      expect(response.status).toBe(200);
      expect(body.request.status).toBe("IN_PROGRESS");
    });
  },
);
