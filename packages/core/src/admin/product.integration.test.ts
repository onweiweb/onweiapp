import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createProduct,
  deleteProduct,
  restoreProduct,
  updateProduct,
} from "./product";

describe.skipIf(!process.env.DATABASE_URL)(
  "admin product writes (integration)",
  { timeout: 20000 },
  () => {
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
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdProductIds.length = 0;
      createdCategoryIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    async function createFixtureCategory() {
      const category = await prisma.category.create({
        data: { name: "Test Category", slug: `test-category-${randomUUID()}` },
      });
      createdCategoryIds.push(category.id);
      return category;
    }

    it("creates a product as DRAFT by default and writes an audit log entry", async () => {
      const category = await createFixtureCategory();
      const slug = `test-product-${randomUUID()}`;

      const product = await createProduct(
        { name: "Test Product", slug, categoryId: category.id },
        actor,
      );
      createdProductIds.push(product.id);

      expect(product.status).toBe("DRAFT");

      const logs = await trackAuditLogsFor(product.id);
      expect(logs.some((log) => log.action === "product.create")).toBe(true);
    });

    it("updates a product's status and writes before/after state", async () => {
      const category = await createFixtureCategory();
      const product = await createProduct(
        {
          name: "Test Product",
          slug: `test-product-${randomUUID()}`,
          categoryId: category.id,
          status: "DRAFT",
        },
        actor,
      );
      createdProductIds.push(product.id);
      await trackAuditLogsFor(product.id);

      const updated = await updateProduct(
        product.id,
        { status: "ACTIVE" },
        actor,
      );

      expect(updated.status).toBe("ACTIVE");
      const logs = await trackAuditLogsFor(product.id);
      const updateLog = logs.find((log) => log.action === "product.update");
      expect((updateLog!.beforeState as { status: string }).status).toBe(
        "DRAFT",
      );
      expect((updateLog!.afterState as { status: string }).status).toBe(
        "ACTIVE",
      );
    });

    it("soft-deletes a product (sets deletedAt, never removes the row) and can restore it", async () => {
      const category = await createFixtureCategory();
      const product = await createProduct(
        {
          name: "Test Product",
          slug: `test-product-${randomUUID()}`,
          categoryId: category.id,
        },
        actor,
      );
      createdProductIds.push(product.id);

      const deleted = await deleteProduct(product.id, actor);
      expect(deleted.deletedAt).not.toBeNull();

      const stillExists = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(stillExists).not.toBeNull();

      const restored = await restoreProduct(product.id, actor);
      expect(restored.deletedAt).toBeNull();

      await trackAuditLogsFor(product.id);
    });

    it("accepts a valid specs list and rejects a malformed one", async () => {
      const category = await createFixtureCategory();

      const product = await createProduct(
        {
          name: "Test Product",
          slug: `test-product-${randomUUID()}`,
          categoryId: category.id,
          specs: [{ label: "Fabric", value: "100% cotton" }],
        },
        actor,
      );
      createdProductIds.push(product.id);
      expect(product.specs).toEqual([
        { label: "Fabric", value: "100% cotton" },
      ]);

      await expect(
        updateProduct(
          product.id,
          { specs: [{ label: "", value: "missing a label" }] },
          actor,
        ),
      ).rejects.toThrow(/invalid-specs/);
    });
  },
);
