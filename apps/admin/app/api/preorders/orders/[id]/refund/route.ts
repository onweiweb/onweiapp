import { suggestPreorderRefund } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { razorpayConfig } from "../../../../_lib/razorpay";

// What to fill in the cash refund box: the reserve minus what Razorpay kept
// on that payment (when Settings say refunds keep the gateway fee).
export const GET = defineAdminRoute<never, { id: string }>(
  { permission: "order:refund" },
  async ({ params }) => {
    const suggestion = await suggestPreorderRefund(params.id, razorpayConfig());
    if (!suggestion)
      return NextResponse.json(
        { ok: false, error: "This pre-order no longer exists." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true, ...suggestion });
  },
);
