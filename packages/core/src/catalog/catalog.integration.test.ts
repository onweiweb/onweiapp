import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import { getActiveProductBySlug } from "./getActiveProductBySlug";
import { listActiveCategories } from "./listActiveCategories";
import { listActiveProductsByCategorySlug } from "./listActiveProductsByCategorySlug";

// Runs against the real, shared Neon dev database — every test creates its
// own uniquely-prefixed fixtures and cleans them up afterward so this is
// safe to run repeatedly and never touches real seed data. Skipped when no
// DATABASE_URL is set (e.g. CI), matching packages/database's own
// client.integration.test.ts convention.
describe.skipIf(!process.env.DATABASE_URL)(
  "catalog (integration)",
  { timeout: 20000 },
  () => {
    const createdCategoryIds: string[] = [];
    const createdProductIds: string[] = [];

    afterEach(async () => {
      // FK-safe order: Inventory -> ProductImage -> ProductVariant -> Product -> Category
      const variants = await prisma.productVariant.findMany({
        where: { productId: { in: createdProductIds } },
        select: { id: true },
      });
      const variantIds = variants.map((v) => v.id);
      await prisma.inventory.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });
      await prisma.productImage.deleteMany({
        where: { productId: { in: createdProductIds } },
      });
      await prisma.productVariant.deleteMany({
        where: { productId: { in: createdProductIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdCategoryIds.length = 0;
      createdProductIds.length = 0;
    });

    async function createFixtureCategory(
      overrides: Partial<{ isActive: boolean }> = {},
    ) {
      const slug = `test-catalog-${randomUUID()}`;
      const category = await prisma.category.create({
        data: {
          name: "Test Category",
          slug,
          isActive: overrides.isActive ?? true,
        },
      });
      createdCategoryIds.push(category.id);
      return category;
    }

    async function createFixtureProduct(
      categoryId: string,
      overrides: Partial<{
        status: "DRAFT" | "ACTIVE" | "ARCHIVED";
        deletedAt: Date | null;
      }> = {},
    ) {
      const slug = `test-product-${randomUUID()}`;
      const product = await prisma.product.create({
        data: {
          name: "Test Product",
          slug,
          categoryId,
          status: overrides.status ?? "ACTIVE",
          deletedAt: overrides.deletedAt ?? null,
        },
      });
      createdProductIds.push(product.id);
      return product;
    }

    async function createFixtureVariant(
      productId: string,
      input: {
        price: number;
        quantityOnHand?: number;
        quantityReserved?: number;
      },
    ) {
      const sku = `test-sku-${randomUUID()}`;
      const variant = await prisma.productVariant.create({
        data: { productId, sku, attributes: { size: "M" }, price: input.price },
      });
      const warehouse = await prisma.warehouse.upsert({
        where: { id: "test-fixture-warehouse" },
        update: {},
        create: {
          id: "test-fixture-warehouse",
          name: "Test Fixture Warehouse",
        },
      });
      await prisma.inventory.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          quantityOnHand: input.quantityOnHand ?? 10,
          quantityReserved: input.quantityReserved ?? 0,
        },
      });
      return variant;
    }

    it("excludes an inactive category from listActiveCategories", async () => {
      const inactive = await createFixtureCategory({ isActive: false });
      const active = await createFixtureCategory({ isActive: true });

      const categories = await listActiveCategories();
      const slugs = categories.map((c) => c.slug);

      expect(slugs).toContain(active.slug);
      expect(slugs).not.toContain(inactive.slug);
    });

    it("excludes DRAFT, ARCHIVED, and soft-deleted products from category listings", async () => {
      const category = await createFixtureCategory();
      const activeProduct = await createFixtureProduct(category.id, {
        status: "ACTIVE",
      });
      await createFixtureVariant(activeProduct.id, { price: 999 });
      const draftProduct = await createFixtureProduct(category.id, {
        status: "DRAFT",
      });
      await createFixtureVariant(draftProduct.id, { price: 999 });
      const archivedProduct = await createFixtureProduct(category.id, {
        status: "ARCHIVED",
      });
      await createFixtureVariant(archivedProduct.id, { price: 999 });
      const deletedProduct = await createFixtureProduct(category.id, {
        deletedAt: new Date(),
      });
      await createFixtureVariant(deletedProduct.id, { price: 999 });

      const result = await listActiveProductsByCategorySlug(category.slug);
      const slugs = result?.products.map((p) => p.slug) ?? [];

      expect(slugs).toContain(activeProduct.slug);
      expect(slugs).not.toContain(draftProduct.slug);
      expect(slugs).not.toContain(archivedProduct.slug);
      expect(slugs).not.toContain(deletedProduct.slug);
    });

    it("returns null for an unknown or inactive category slug", async () => {
      expect(
        await listActiveProductsByCategorySlug(
          `does-not-exist-${randomUUID()}`,
        ),
      ).toBeNull();

      const inactive = await createFixtureCategory({ isActive: false });
      expect(await listActiveProductsByCategorySlug(inactive.slug)).toBeNull();
    });

    it("returns null for a DRAFT or soft-deleted product's slug", async () => {
      const category = await createFixtureCategory();
      const draftProduct = await createFixtureProduct(category.id, {
        status: "DRAFT",
      });
      const deletedProduct = await createFixtureProduct(category.id, {
        deletedAt: new Date(),
      });

      expect(await getActiveProductBySlug(draftProduct.slug)).toBeNull();
      expect(await getActiveProductBySlug(deletedProduct.slug)).toBeNull();
    });

    it("reports correct in-stock/out-of-stock state per variant", async () => {
      const category = await createFixtureCategory();
      const product = await createFixtureProduct(category.id);
      await createFixtureVariant(product.id, { price: 999, quantityOnHand: 5 });
      await createFixtureVariant(product.id, {
        price: 1499,
        quantityOnHand: 0,
      });

      const detail = await getActiveProductBySlug(product.slug);

      expect(detail?.variants).toHaveLength(2);
      expect(detail?.variants.filter((v) => v.inStock)).toHaveLength(1);
      expect(detail?.variants.filter((v) => !v.inStock)).toHaveLength(1);
    });

    it("returns image: null for a product with zero ProductImage rows", async () => {
      const category = await createFixtureCategory();
      const product = await createFixtureProduct(category.id);
      await createFixtureVariant(product.id, { price: 999 });

      const result = await listActiveProductsByCategorySlug(category.slug);
      const listItem = result?.products.find((p) => p.slug === product.slug);

      expect(listItem?.image).toBeNull();
    });
  },
);
