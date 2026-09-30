import { deleteProduct, updateProduct } from "@onwei/core";
import type { ProductSpecInput } from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";

export const GET = defineAdminRoute<never, { id: string }>(
  {},
  async ({ params }) => {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { include: { inventory: { include: { warehouse: true } } } },
      },
    });
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that product." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, product });
  },
);

// Only checks that specs is a list of objects. What each spec must contain is
// checked in core (validateSpecs), which answers with "invalid-specs" text.
const specsSchema = z.array(
  z.custom<ProductSpecInput>(
    (value) => typeof value === "object" && value !== null,
  ),
);

// Every field is optional: an omitted field is left alone, null clears the
// nullable ones.
const bodySchema = z.object({
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  specs: specsSchema.optional(),
  description: z.string().nullable().optional(),
  whoThisIsFor: z.string().nullable().optional(),
  careInstructions: z.string().nullable().optional(),
  powerRating: z.number().nullable().optional(),
  spinRating: z.number().nullable().optional(),
  controlRating: z.number().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "product:update",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const product = await updateProduct(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, product });
    } catch (error) {
      console.error(error);
      const invalidSpecs =
        error instanceof Error && error.message.startsWith("invalid-specs");
      return NextResponse.json(
        {
          ok: false,
          error: invalidSpecs
            ? (error as Error).message.replace("invalid-specs: ", "")
            : "Couldn't find that product.",
        },
        { status: invalidSpecs ? 400 : 404 },
      );
    }
  },
);

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "product:delete" },
  async ({ staff, params }) => {
    try {
      const product = await deleteProduct(params.id, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, product });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that product." },
        { status: 404 },
      );
    }
  },
);
