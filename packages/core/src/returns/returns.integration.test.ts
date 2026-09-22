import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { approveReturn } from "./approveReturn";
import { rejectReturn } from "./rejectReturn";

describe.skipIf(!process.env.DATABASE_URL)(
  "approveReturn / rejectReturn (integration)",
  { timeout: 20000 },
  () => {
    const createdReturnIds: string[] = [];
    const createdOrderItemIds: string[] = [];
    const createdOrderIds: string[] = [];
    const createdAddressIds: string[] = [];
    const createdCustomerIds: string[] = [];
    const createdInventoryIds: string[] = [];
    const createdVariantIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdCategoryIds: string[] = [];
    const createdWarehouseIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    const createdInventoryLogSkus: string[] = [];
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
      await prisma.inventoryLog.deleteMany({
        where: { variantSku: { in: createdInventoryLogSkus } },
      });
      await prisma.returnRequest.deleteMany({
        where: { id: { in: createdReturnIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { id: { in: createdOrderItemIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      await prisma.address.deleteMany({
        where: { id: { in: createdAddressIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      await prisma.inventory.deleteMany({
        where: { id: { in: createdInventoryIds } },
      });
      await prisma.productVariant.deleteMany({
        where: { id: { in: createdVariantIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      await prisma.warehouse.deleteMany({
        where: { id: { in: createdWarehouseIds } },
      });
      createdReturnIds.length = 0;
      createdOrderItemIds.length = 0;
      createdOrderIds.length = 0;
      createdAddressIds.length = 0;
      createdCustomerIds.length = 0;
      createdInventoryIds.length = 0;
      createdVariantIds.length = 0;
      createdProductIds.length = 0;
      createdCategoryIds.length = 0;
      createdWarehouseIds.length = 0;
      createdAuditLogIds.length = 0;
      createdInventoryLogSkus.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    async function createFixtureReturnRequest(quantityOnHand: number) {
      const category = await prisma.category.create({
        data: { name: "Test Category", slug: `test-category-${randomUUID()}` },
      });
      createdCategoryIds.push(category.id);
      const product = await prisma.product.create({
        data: {
          name: "Test Product",
          slug: `test-product-${randomUUID()}`,
          categoryId: category.id,
        },
      });
      createdProductIds.push(product.id);
      const sku = `TEST-SKU-${randomUUID()}`;
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku, attributes: {}, price: 1000 },
      });
      createdVariantIds.push(variant.id);
      createdInventoryLogSkus.push(sku);
      const warehouse = await prisma.warehouse.create({
        data: { name: `Test Warehouse ${randomUUID()}` },
      });
      createdWarehouseIds.push(warehouse.id);
      const inventory = await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          quantityOnHand,
        },
      });
      createdInventoryIds.push(inventory.id);

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
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productVariantId: variant.id,
          quantity: 2,
          unitPrice: 500,
          totalAmount: 1000,
        },
      });
      createdOrderItemIds.push(orderItem.id);
      const returnRequest = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          orderItemId: orderItem.id,
          reason: "Doesn't fit",
        },
      });
      createdReturnIds.push(returnRequest.id);

      return { returnRequest, variant, inventory };
    }

    it("approving restocks the returned quantity, logs reason RETURN, and writes an audit log entry", async () => {
      const { returnRequest, variant, inventory } =
        await createFixtureReturnRequest(5);

      const updated = await approveReturn(
        { returnRequestId: returnRequest.id },
        actor,
      );

      expect(updated.status).toBe("APPROVED");

      const refreshedInventory = await prisma.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      });
      expect(refreshedInventory.quantityOnHand).toBe(7);

      const inventoryLog = await prisma.inventoryLog.findFirst({
        where: { variantSku: variant.sku, reason: "RETURN" },
      });
      expect(inventoryLog?.changeQty).toBe(2);

      const auditLogs = await trackAuditLogsFor(returnRequest.id);
      expect(auditLogs.some((log) => log.action === "return.approve")).toBe(
        true,
      );
    });

    it("rejecting does not change inventory", async () => {
      const { returnRequest, inventory } = await createFixtureReturnRequest(5);

      const updated = await rejectReturn(
        { returnRequestId: returnRequest.id },
        actor,
      );

      expect(updated.status).toBe("REJECTED");

      const refreshedInventory = await prisma.inventory.findUniqueOrThrow({
        where: { id: inventory.id },
      });
      expect(refreshedInventory.quantityOnHand).toBe(5);
    });

    it("rejects resolving a return request that isn't pending", async () => {
      const { returnRequest } = await createFixtureReturnRequest(5);
      await rejectReturn({ returnRequestId: returnRequest.id }, actor);

      await expect(
        approveReturn({ returnRequestId: returnRequest.id }, actor),
      ).rejects.toThrow(/not-pending/);
    });
  },
);
