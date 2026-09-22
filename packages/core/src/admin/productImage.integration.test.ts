import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  addProductImage,
  removeProductImage,
  reorderProductImages,
} from "./productImage";

describe.skipIf(!process.env.DATABASE_URL)(
  "admin product image writes (integration)",
  { timeout: 20000 },
  () => {
    const createdImageIds: string[] = [];
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
      await prisma.productImage.deleteMany({
        where: { id: { in: createdImageIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdImageIds.length = 0;
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

    it("adds a real (non-placeholder) image and writes an audit log entry", async () => {
      const product = await createFixtureProduct();

      const image = await addProductImage(
        { productId: product.id, url: "https://example.com/photo.jpg" },
        actor,
      );
      createdImageIds.push(image.id);

      expect(image.isPlaceholder).toBe(false);
      const logs = await trackAuditLogsFor(image.id);
      expect(logs.some((log) => log.action === "productImage.add")).toBe(true);
    });

    it("removes an image and writes an audit log entry with its prior state", async () => {
      const product = await createFixtureProduct();
      const image = await addProductImage(
        { productId: product.id, url: "https://example.com/photo.jpg" },
        actor,
      );
      await trackAuditLogsFor(image.id);

      await removeProductImage(image.id, actor);

      const stillExists = await prisma.productImage.findUnique({
        where: { id: image.id },
      });
      expect(stillExists).toBeNull();

      const logs = await trackAuditLogsFor(image.id);
      const removeLog = logs.find(
        (log) => log.action === "productImage.remove",
      );
      expect(removeLog).toBeDefined();
      expect((removeLog!.beforeState as { url: string }).url).toBe(
        "https://example.com/photo.jpg",
      );
    });

    it("reorders images to match the given id order", async () => {
      const product = await createFixtureProduct();
      const first = await addProductImage(
        { productId: product.id, url: "https://example.com/1.jpg" },
        actor,
      );
      const second = await addProductImage(
        { productId: product.id, url: "https://example.com/2.jpg" },
        actor,
      );
      createdImageIds.push(first.id, second.id);
      await trackAuditLogsFor(first.id);
      await trackAuditLogsFor(second.id);

      await reorderProductImages(product.id, [second.id, first.id], actor);
      await trackAuditLogsFor(product.id);

      const reordered = await prisma.productImage.findMany({
        where: { productId: product.id },
        orderBy: { sortOrder: "asc" },
      });
      expect(reordered.map((image) => image.id)).toEqual([second.id, first.id]);
    });
  },
);
