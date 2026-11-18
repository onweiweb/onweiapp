import { previewPreorderJourney } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  variantId: z.string().min(1, "Pick a product.").max(64),
  reserveAmount: z.number().min(0).max(100000),
  tiers: z
    .array(
      z.object({
        label: z.string().max(60),
        percent: z.number().int().min(0).max(90),
      }),
    )
    .min(1)
    .max(5),
});

// "What a customer pays" under the Pre-order journey table: the form's tiers
// (saved or not) priced for one product, for everyone and for Insiders.
export const POST = defineAdminRoute(
  { permission: "coupon:create", body: bodySchema },
  async ({ body }) => {
    const preview = await previewPreorderJourney({
      variantId: body.variantId,
      tiers: body.tiers,
      reservePerItem: Math.round(body.reserveAmount * 100),
    });
    if (!preview) {
      return NextResponse.json(
        { ok: false, error: "That product no longer exists." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, preview });
  },
);
