import { createProduct } from "@onwei/core";
import type { ProductSpecInput } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { requiredText } from "../_lib/schemas";
import { triggerCatalogRevalidate } from "../_lib/triggerCatalogRevalidate";

const PAGE_SIZE = 25;

export const GET = defineAdminRoute({}, async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        variants: { include: { inventory: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  return NextResponse.json({
    ok: true,
    products,
    pagination: { page, pageSize: PAGE_SIZE, total },
  });
});

// Only checks that specs is a list of objects. What each spec must contain is
// checked in core (validateSpecs), which answers with "invalid-specs" text.
const specsSchema = z.array(
  z.custom<ProductSpecInput>(
    (value) => typeof value === "object" && value !== null,
  ),
);

const MESSAGE = "Give the product a name, a URL slug, and a category.";

const bodySchema = z.object({
  name: requiredText(MESSAGE),
  slug: requiredText(MESSAGE),
  categoryId: requiredText(MESSAGE),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).catch("DRAFT"),
  description: z.string().nullish(),
  specs: specsSchema.optional(),
  whoThisIsFor: z.string().nullish(),
  careInstructions: z.string().nullish(),
  powerRating: z.number().nullish(),
  spinRating: z.number().nullish(),
  controlRating: z.number().nullish(),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
});

export const POST = defineAdminRoute(
  { permission: "product:create", body: bodySchema, emptyBodyMessage: MESSAGE },
  async ({ staff, body }) => {
    try {
      const product = await createProduct(
        {
          name: body.name,
          slug: body.slug,
          categoryId: body.categoryId,
          description: body.description ?? null,
          status: body.status,
          specs: body.specs,
          whoThisIsFor: body.whoThisIsFor ?? null,
          careInstructions: body.careInstructions ?? null,
          powerRating: body.powerRating ?? null,
          spinRating: body.spinRating ?? null,
          controlRating: body.controlRating ?? null,
          metaTitle: body.metaTitle ?? null,
          metaDescription: body.metaDescription ?? null,
        },
        { staffUserId: staff.staffUserId },
      );
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, product }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("invalid-specs")
          ? error.message.replace("invalid-specs: ", "")
          : "Couldn't create that product.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
