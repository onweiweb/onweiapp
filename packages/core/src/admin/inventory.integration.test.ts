import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { adjustInventory, listInventory } from "./inventory";

describe.skipIf(!process.env.DATABASE_URL)(
  "admin inventory writes (integration)",
  { timeout: 20000 },
  () => {
    const createdInventoryIds: string[] = [];
    const createdVariantIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdCategoryIds: string[] = [];
    const createdWarehouseIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    const createdInventoryLogSkus: string[] = [];
    // AuditLog.staffUserId has a real FK to StaffUser, so the actor must be
    // a real row, not just any string id.
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

    async function createFixtureInventory(quantityOnHand: number) {
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
        data: {
          productId: product.id,
          sku,
          attributes: {},
          price: 1000,
        },
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
      return { inventory, variant, warehouse };
    }

    it("increases on-hand stock, logs the change, and writes an audit log entry", async () => {
      const { inventory, variant, warehouse } =
        await createFixtureInventory(10);

      const updated = await adjustInventory(
        {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          delta: 5,
          reason: "RESTOCK",
        },
        actor,
      );

      expect(updated.quantityOnHand).toBe(15);

      const inventoryLog = await prisma.inventoryLog.findFirst({
        where: { variantSku: variant.sku },
      });
      expect(inventoryLog?.changeQty).toBe(5);
      expect(inventoryLog?.productVariantId).toBe(variant.id);
      expect(inventoryLog?.reason).toBe("RESTOCK");

      const auditLogs = await trackAuditLogsFor(inventory.id);
      expect(auditLogs.some((log) => log.action === "inventory.adjust")).toBe(
        true,
      );
    });

    it("decreases on-hand stock for a correction", async () => {
      const { variant, warehouse } = await createFixtureInventory(10);

      const updated = await adjustInventory(
        {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          delta: -3,
          reason: "ADJUSTMENT",
        },
        actor,
      );

      expect(updated.quantityOnHand).toBe(7);
    });

    it("rejects an adjustment that would take on-hand stock negative", async () => {
      const { variant, warehouse } = await createFixtureInventory(2);

      await expect(
        adjustInventory(
          {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            delta: -5,
            reason: "ADJUSTMENT",
          },
          actor,
        ),
      ).rejects.toThrow(/negative/i);
    });

    it("applies concurrent adjustments atomically instead of losing an update", async () => {
      const { variant, warehouse } = await createFixtureInventory(10);

      // 10 concurrent +1 adjustments. A read-compute-write implementation
      // races here and typically loses several updates; the atomic
      // `updateMany ... WHERE qty + delta >= 0` version can't.
      await Promise.all(
        Array.from({ length: 10 }, () =>
          adjustInventory(
            {
              productVariantId: variant.id,
              warehouseId: warehouse.id,
              delta: 1,
              reason: "ADJUSTMENT",
            },
            actor,
          ),
        ),
      );

      const final = await prisma.inventory.findUniqueOrThrow({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
          },
        },
      });
      expect(final.quantityOnHand).toBe(20);
    });

    it("rejects a concurrent adjustment that would take stock negative without corrupting the count", async () => {
      const { variant, warehouse } = await createFixtureInventory(5);

      // Five concurrent -1s should all succeed (5 -> 0); a sixth concurrent
      // -1 should be rejected, not allowed to push stock to -1.
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          adjustInventory(
            {
              productVariantId: variant.id,
              warehouseId: warehouse.id,
              delta: -1,
              reason: "ADJUSTMENT",
            },
            actor,
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(5);
      expect(rejected).toHaveLength(1);

      const final = await prisma.inventory.findUniqueOrThrow({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
          },
        },
      });
      expect(final.quantityOnHand).toBe(0);
    });

    it("listInventory with lowStockOnly only returns rows at or below their reorder threshold", async () => {
      const low = await createFixtureInventory(1);
      await prisma.inventory.update({
        where: { id: low.inventory.id },
        data: { reorderThreshold: 5 },
      });
      const healthy = await createFixtureInventory(50);

      const lowStockRows = await listInventory({ lowStockOnly: true });
      const lowStockIds = lowStockRows.map((row) => row.id);

      expect(lowStockIds).toContain(low.inventory.id);
      expect(lowStockIds).not.toContain(healthy.inventory.id);
    });
  },
);
