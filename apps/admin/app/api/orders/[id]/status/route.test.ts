// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/orders/[id]/status",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdOrderIds: string[] = [];
    const createdAddressIds: string[] = [];
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
        where: { entityId: { in: createdOrderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      await prisma.address.deleteMany({
        where: { id: { in: createdAddressIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      createdOrderIds.length = 0;
      createdAddressIds.length = 0;
      createdCustomerIds.length = 0;
    });

    async function createFixtureOrder() {
      const customer = await prisma.customer.create({
        data: { email: `test-customer-${crypto.randomUUID()}@example.com` },
      });
      createdCustomerIds.push(customer.id);
      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: "SHIPPING",
          line1: "1 Test Street",
          city: "Bengaluru",
          state: "KA",
          postalCode: "560001",
          country: "IN",
        },
      });
      createdAddressIds.push(address.id);
      const order = await prisma.order.create({
        data: {
          orderNumber: `TEST-ROUTE-${crypto.randomUUID()}`,
          customerId: customer.id,
          subtotal: 1000,
          total: 1000,
          shippingAddressId: address.id,
          billingAddressId: address.id,
        },
      });
      createdOrderIds.push(order.id);
      return order;
    }

    it("returns 401 with no session", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request("http://localhost/api/orders/x/status", {
          method: "PATCH",
          body: JSON.stringify({ status: "CONFIRMED" }),
        }),
        { params: Promise.resolve({ id: "x" }) },
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 for an unrecognized status", async () => {
      const order = await createFixtureOrder();
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ status: "NOT_A_REAL_STATUS" }),
        }),
        { params: Promise.resolve({ id: order.id }) },
      );
      expect(response.status).toBe(400);
    });

    it("updates the status on the happy path", async () => {
      const order = await createFixtureOrder();
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ status: "CONFIRMED" }),
        }),
        { params: Promise.resolve({ id: order.id }) },
      );
      const body = (await response.json()) as { order: { status: string } };

      expect(response.status).toBe(200);
      expect(body.order.status).toBe("CONFIRMED");
    });

    it("returns 400 with a plain-language error for an illegal transition", async () => {
      const order = await createFixtureOrder();
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ status: "DELIVERED" }),
        }),
        { params: Promise.resolve({ id: order.id }) },
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/can't move/i);
    });
  },
);
