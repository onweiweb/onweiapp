// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/returns/[id]/reject",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const createdReturnIds: string[] = [];
    const createdOrderItemIds: string[] = [];
    const createdOrderIds: string[] = [];
    const createdAddressIds: string[] = [];
    const createdCustomerIds: string[] = [];
    const createdVariantIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdCategoryIds: string[] = [];

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
        where: { entityId: { in: createdReturnIds } },
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
      await prisma.productVariant.deleteMany({
        where: { id: { in: createdVariantIds } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdReturnIds.length = 0;
      createdOrderItemIds.length = 0;
      createdOrderIds.length = 0;
      createdAddressIds.length = 0;
      createdCustomerIds.length = 0;
      createdVariantIds.length = 0;
      createdProductIds.length = 0;
      createdCategoryIds.length = 0;
    });

    async function createFixtureReturnRequest() {
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
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `TEST-ROUTE-SKU-${crypto.randomUUID()}`,
          attributes: {},
          price: 1000,
        },
      });
      createdVariantIds.push(variant.id);

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
      return { returnRequest };
    }

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost/api/returns/x/reject", {
          method: "POST",
        }),
        { params: Promise.resolve({ id: "x" }) },
      );
      expect(response.status).toBe(401);
    });

    it("rejects on the happy path without touching inventory", async () => {
      const { returnRequest } = await createFixtureReturnRequest();
      const { POST } = await import("./route");

      const response = await POST(
        new Request(`http://localhost/api/returns/${returnRequest.id}/reject`, {
          method: "POST",
          headers: { cookie: cookieHeader },
        }),
        { params: Promise.resolve({ id: returnRequest.id }) },
      );
      const body = (await response.json()) as {
        returnRequest: { status: string };
      };

      expect(response.status).toBe(200);
      expect(body.returnRequest.status).toBe("REJECTED");
    });
  },
);
