import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { updateOrderStatus } from "./updateOrderStatus";

describe.skipIf(!process.env.DATABASE_URL)(
  "updateOrderStatus (integration)",
  { timeout: 20000 },
  () => {
    const createdOrderIds: string[] = [];
    const createdAddressIds: string[] = [];
    const createdCustomerIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    let actor: { staffUserId: string };

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      actor = { staffUserId: staffUser.id };
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: actor.staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
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
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    async function createFixtureOrder() {
      const customer = await prisma.customer.create({
        data: { email: `test-customer-${randomUUID()}@example.com` },
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
          orderNumber: `TEST-${randomUUID()}`,
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

    it("moves the order to the new status, records history, and writes an audit log entry", async () => {
      const order = await createFixtureOrder();

      const updated = await updateOrderStatus(
        { orderId: order.id, toStatus: "CONFIRMED" },
        actor,
      );

      expect(updated.status).toBe("CONFIRMED");

      const history = await prisma.orderStatusHistory.findFirst({
        where: { orderId: order.id, status: "CONFIRMED" },
      });
      expect(history?.changedBy).toBe(actor.staffUserId);

      const auditLogs = await trackAuditLogsFor(order.id);
      expect(auditLogs.some((log) => log.action === "order.updateStatus")).toBe(
        true,
      );
    });

    it("rejects a transition that isn't legal from the current status", async () => {
      const order = await createFixtureOrder();

      await expect(
        updateOrderStatus({ orderId: order.id, toStatus: "DELIVERED" }, actor),
      ).rejects.toThrow(/invalid-transition/);
    });
  },
);
