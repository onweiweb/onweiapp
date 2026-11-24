import { DeliveryDetailsError, updateProductVariant } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../../_lib/triggerCatalogRevalidate";

// Every field is optional: an omitted field is left alone, null clears the
// nullable ones.
const bodySchema = z.object({
  sku: z.string().trim().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  price: z.number().optional(),
  compareAtPrice: z.number().nullable().optional(),
  weightGrams: z.number().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export const PATCH = defineAdminRoute<
  typeof bodySchema,
  { id: string; variantId: string }
>(
  {
    permission: "productVariant:update",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const variant = await updateProductVariant(params.variantId, body, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, variant });
    } catch (error) {
      if (error instanceof DeliveryDetailsError) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "Couldn't find that variant." },
        { status: 404 },
      );
    }
  },
);
