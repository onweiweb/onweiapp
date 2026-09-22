import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createProductVariant, updateProductVariant } from "./productVariant";

describe.skipIf(!process.env.DATABASE_URL)(
  "admin product variant writes (integration)",
  { timeout: 20000 },
  () => {
    const createdVariantIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdCategoryIds: string[] = [];
    const createdAuditLogIds: string[] = [];
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
      await prisma.productVariant.deleteMany({
        where: { id: { in: createdVariantIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdVariantIds.length = 0;
      createdProductIds.length = 0;
      createdCategoryIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    async function createFixtureProduct() {
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
      return product;
    }

    it("creates a variant with the given price and writes an audit log entry", async () => {
      const product = await createFixtureProduct();
      const sku = `TEST-SKU-${randomUUID()}`;

      const variant = await createProductVariant(
        {
          productId: product.id,
          sku,
          attributes: { size: "M", color: "Navy" },
          price: 1999,
        },
        actor,
      );
      createdVariantIds.push(variant.id);

      expect(variant.sku).toBe(sku);
      expect(variant.price.toNumber()).toBe(1999);

      const logs = await trackAuditLogsFor(variant.id);
      expect(logs.some((log) => log.action === "productVariant.create")).toBe(
        true,
      );
    });

    it("updates a variant's price and serializes Decimal fields as strings in the audit log", async () => {
      const product = await createFixtureProduct();
      const variant = await createProductVariant(
        {
          productId: product.id,
          sku: `TEST-SKU-${randomUUID()}`,
          attributes: { size: "M" },
          price: 1000,
        },
        actor,
      );
      createdVariantIds.push(variant.id);
      await trackAuditLogsFor(variant.id);

      const updated = await updateProductVariant(
        variant.id,
        { price: 1500 },
        actor,
      );

      expect(updated.price.toNumber()).toBe(1500);
      const logs = await trackAuditLogsFor(variant.id);
      const updateLog = logs.find(
        (log) => log.action === "productVariant.update",
      );
      expect((updateLog!.beforeState as { price: string }).price).toBe("1000");
      expect((updateLog!.afterState as { price: string }).price).toBe("1500");
    });
  },
);
