import { cancelOrderByStaff } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { actionError } from "../../../_lib/orderActionResponse";
import { razorpayConfig } from "../../../_lib/razorpay";

const bodySchema = z.object({ reason: z.string().max(300) });

// Cancelling a paid order refunds it, so this needs the refund permission.
export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "order:refund", body: bodySchema },
  async ({ staff, body, params }) => {
    try {
      const result = await cancelOrderByStaff(
        params.id,
        body.reason,
        { staffUserId: staff.staffUserId },
        razorpayConfig(),
      );
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return actionError(error);
    }
  },
);
