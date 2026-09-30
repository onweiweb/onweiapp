import { createProductVariant } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { requiredText } from "../../../_lib/schemas";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";

const MESSAGE =
  "Give the variant a SKU, a price, and its attributes (size, color, etc).";

const bodySchema = z.object({
  sku: requiredText(MESSAGE),
  attributes: z.record(z.string(), z.string(), { error: MESSAGE }),
  price: z.number({ error: MESSAGE }),
  compareAtPrice: z.number().nullish(),
  weightGrams: z.number().nullish(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).catch("ACTIVE"),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "productVariant:create",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body, params }) => {
    try {
      const variant = await createProductVariant(
        {
          productId: params.id,
          sku: body.sku,
          attributes: body.attributes,
          price: body.price,
          compareAtPrice: body.compareAtPrice ?? null,
          weightGrams: body.weightGrams ?? null,
          status: body.status,
        },
        { staffUserId: staff.staffUserId },
      );
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, variant }, { status: 201 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "That SKU is already in use." },
        { status: 400 },
      );
    }
  },
);
