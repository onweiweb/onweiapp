import { getStoreSettings, previewCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { couponDraftSchema } from "../builder/_schema";

const bodySchema = z.object({
  draft: couponDraftSchema,
  cartValue: z.number().min(0).max(10_000_000),
  items: z.number().int().min(1).max(50),
});

// The coupon form's live preview, worked out by the same engine as checkout.
export const POST = defineAdminRoute(
  { permission: "coupon:create", body: bodySchema },
  async ({ body }) => {
    const settings = await getStoreSettings();
    const result = previewCoupon(
      body.draft,
      { cartValue: body.cartValue, items: body.items },
      {
        freeThreshold: settings.freeShippingThreshold,
        fee: settings.deliveryFee,
      },
    );
    return NextResponse.json({ ok: true, ...result });
  },
);
