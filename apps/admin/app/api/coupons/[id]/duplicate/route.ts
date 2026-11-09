import { duplicateCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "coupon:create" },
  async ({ staff, params }) => {
    const result = await duplicateCoupon(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: Object.values(result.errors)[0] ?? "Couldn't copy it.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, id: result.id });
  },
);
