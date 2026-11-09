import { saveCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { couponDraftSchema } from "./_schema";

export const POST = defineAdminRoute(
  { permission: "coupon:create", body: couponDraftSchema },
  async ({ staff, body }) => {
    const result = await saveCoupon(body, { staffUserId: staff.staffUserId });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 },
      );
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  },
);
