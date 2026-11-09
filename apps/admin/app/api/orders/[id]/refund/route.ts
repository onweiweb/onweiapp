import { refundOrderAmount } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { razorpayConfig } from "../../../_lib/razorpay";

const bodySchema = z.object({
  amount: z
    .number({ error: "Enter an amount in rupees." })
    .positive("Enter an amount above ₹0."),
  note: z.string().max(300).default(""),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "order:refund", body: bodySchema },
  async ({ staff, body, params }) => {
    const result = await refundOrderAmount(
      params.id,
      Math.round(body.amount * 100),
      body.note,
      { staffUserId: staff.staffUserId },
      razorpayConfig(),
    );
    if (!result.ok)
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 400 },
      );
    return NextResponse.json({ ok: true });
  },
);
