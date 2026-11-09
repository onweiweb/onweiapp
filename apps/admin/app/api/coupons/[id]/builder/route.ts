import { saveCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { couponDraftSchema } from "../../builder/_schema";

export const PUT = defineAdminRoute<typeof couponDraftSchema, { id: string }>(
  { permission: "coupon:update", body: couponDraftSchema },
  async ({ staff, body, params }) => {
    const result = await saveCoupon(
      body,
      { staffUserId: staff.staffUserId },
      params.id,
    );
    if (!result.ok)
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 },
      );
    return NextResponse.json({ ok: true, id: result.id });
  },
);
