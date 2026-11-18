import { notifyPreorder, requestPreorderBalance } from "@onwei/core";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { razorpayConfig } from "../../_lib/razorpay";

export const maxDuration = 60;

const bodySchema = z.object({
  productId: z.string().min(1, "Pick a product.").max(64),
});

// "Stock is in, ask for balance": holds stock for the oldest reservations of
// this product and sends each a balance link by email and WhatsApp.
export const POST = defineAdminRoute(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ body, staff }) => {
    const result = await requestPreorderBalance({
      productId: body.productId,
      actor: { staffUserId: staff.staffUserId },
      razorpay: razorpayConfig(),
    });
    if ("error" in result)
      return NextResponse.json(
        {
          ok: false,
          error:
            "Online payments aren't set up, so no balance links can be sent.",
        },
        { status: 503 },
      );
    const siteUrl = process.env.WEB_APP_URL?.replace(/\/$/, "") || undefined;
    after(async () => {
      for (const order of result.asked)
        await notifyPreorder(
          order.orderId,
          { type: "BALANCE", reminder: 0 },
          { siteUrl },
        );
    });
    return NextResponse.json({
      ok: true,
      asked: result.asked.length,
      confirmed: result.confirmed.length,
      waiting: result.waiting,
      missingGifts: result.missingGifts,
      failed: result.failed,
    });
  },
);
