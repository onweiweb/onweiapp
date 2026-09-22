// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "GET/PATCH/DELETE /api/products/[id]",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdCategoryIds: string[] = [];
    const createdProductIds: string[] = [];

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
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdProductIds.length = 0;
      createdCategoryIds.length = 0;
    });

    async function createFixtureProduct() {
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
      return product;
    }

    it("returns 404 for an unknown product id", async () => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request("http://localhost/api/products/nonexistent", {
          headers: { cookie: cookieHeader },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) },
      );
      expect(response.status).toBe(404);
    });

    it("updates a product's status on the happy path", async () => {
      const product = await createFixtureProduct();
      const { PATCH } = await import("./route");

      const response = await PATCH(
        new Request(`http://localhost/api/products/${product.id}`, {
          method: "PATCH",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ status: "ACTIVE" }),
        }),
        { params: Promise.resolve({ id: product.id }) },
      );
      const body = (await response.json()) as { product: { status: string } };

      expect(response.status).toBe(200);
      expect(body.product.status).toBe("ACTIVE");
    });

    it("soft-deletes a product on DELETE without removing the row", async () => {
      const product = await createFixtureProduct();
      const { DELETE } = await import("./route");

      const response = await DELETE(
        new Request(`http://localhost/api/products/${product.id}`, {
          method: "DELETE",
          headers: { cookie: cookieHeader },
        }),
        { params: Promise.resolve({ id: product.id }) },
      );
      expect(response.status).toBe(200);

      const stillExists = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });
  },
);
