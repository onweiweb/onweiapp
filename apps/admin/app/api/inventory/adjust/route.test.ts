// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/inventory/adjust",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdCategoryIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdVariantIds: string[] = [];
    const createdWarehouseIds: string[] = [];
    const createdInventoryLogSkus: string[] = [];

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
        where: { entityId: { in: createdProductIds } },
      });
      await prisma.inventoryLog.deleteMany({
        where: { variantSku: { in: createdInventoryLogSkus } },
      });
      await prisma.inventory.deleteMany({
        where: { productVariantId: { in: createdVariantIds } },
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
      createdCategoryIds.length = 0;
      createdProductIds.length = 0;
      createdVariantIds.length = 0;
      createdWarehouseIds.length = 0;
      createdInventoryLogSkus.length = 0;
    });

    async function createFixtureInventory(quantityOnHand: number) {
      const category = await prisma.category.create({
        data: {
          name: "Test Category",
          slug: `test-category-${crypto.randomUUID()}`,
        },
      });
      createdCategoryIds.push(category.id);
      const product = await prisma.product.create({
        data: {
          name: "Test Product",
          slug: `test-product-${crypto.randomUUID()}`,
          categoryId: category.id,
        },
      });
      createdProductIds.push(product.id);
      const sku = `TEST-ROUTE-SKU-${crypto.randomUUID()}`;
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku, attributes: {}, price: 1000 },
      });
      createdVariantIds.push(variant.id);
      createdInventoryLogSkus.push(sku);
      const warehouse = await prisma.warehouse.create({
        data: { name: `Test Warehouse ${crypto.randomUUID()}` },
      });
      createdWarehouseIds.push(warehouse.id);
      await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          quantityOnHand,
        },
      });
      return { variant, warehouse };
    }

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/inventory/adjust", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 for a missing reason", async () => {
      const { variant, warehouse } = await createFixtureInventory(10);
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/inventory/adjust", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            delta: 5,
          }),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("applies a restock on the happy path", async () => {
      const { variant, warehouse } = await createFixtureInventory(10);
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/inventory/adjust", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            delta: 5,
            reason: "RESTOCK",
          }),
        }),
      );
      const body = (await response.json()) as {
        inventory: { quantityOnHand: number };
      };

      expect(response.status).toBe(200);
      expect(body.inventory.quantityOnHand).toBe(15);
    });

    it("returns 400 with a plain-language error when the adjustment would go negative", async () => {
      const { variant, warehouse } = await createFixtureInventory(2);
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/inventory/adjust", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            delta: -5,
            reason: "ADJUSTMENT",
          }),
        }),
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/below zero/i);
    });
  },
);
