import { checkPrice } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  variantId: z.string().min(1, "Pick a product.").max(64),
  quantity: z.number().int().min(1, "At least 1.").max(10, "At most 10."),
  insider: z.boolean(),
  preorder: z.boolean(),
  codes: z.array(z.string().max(40)).max(5),
});

export const POST = defineAdminRoute(
  { permission: "coupon:create", body: bodySchema },
  async ({ body }) => {
    const result = await checkPrice(body);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason === "NO_CAMPAIGN"
              ? "Set up the pre-order on the Pre-order tab first."
              : "That product no longer exists.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  },
);
