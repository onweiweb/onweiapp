import { hasPermission } from "@onwei/auth";
import { cancelPreorder, notifyPreorder } from "@onwei/core";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { razorpayConfig } from "../../../../_lib/razorpay";

const bodySchema = z.object({
  mode: z.enum(["CREDIT", "REFUND"]),
  reason: z
    .string()
    .trim()
    .min(2, "Say why it's being cancelled.")
    .max(200, "Keep the reason under 200 characters."),
});

const PROBLEMS: Record<string, string> = {
  NOT_FOUND: "This pre-order no longer exists.",
  NOT_CANCELLABLE:
    "Only reserved pre-orders whose balance isn't paid can be cancelled here.",
  REFUND_FAILED:
    "Cancelled, but the refund didn't go through. Refund it in Razorpay.",
};

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ body, staff, params }) => {
    if (
      body.mode === "REFUND" &&
      !hasPermission(staff.permissions, "order:refund")
    )
      return NextResponse.json(
        {
          ok: false,
          error: "You can't give refunds. Keep it as credit instead.",
        },
        { status: 403 },
      );
    const result = await cancelPreorder({
      orderId: params.id,
      mode: body.mode,
      reason: body.reason,
      actor: { staffUserId: staff.staffUserId },
      razorpay: razorpayConfig(),
    });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, error: PROBLEMS[result.reason] ?? "That didn't work." },
        { status: result.reason === "NOT_FOUND" ? 404 : 409 },
      );
    if (result.mode === "CREDIT") {
      const siteUrl = process.env.WEB_APP_URL?.replace(/\/$/, "") || undefined;
      after(() =>
        notifyPreorder(result.orderId, { type: "CREDIT" }, { siteUrl }),
      );
    }
    return NextResponse.json({
      ok: true,
      creditCode: result.creditCode ?? null,
    });
  },
);
