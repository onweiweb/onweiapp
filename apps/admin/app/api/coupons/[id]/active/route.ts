import { setCouponActive } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({ isActive: z.boolean() });

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "coupon:update", body: bodySchema },
  async ({ staff, body, params }) => {
    await setCouponActive(params.id, body.isActive, {
      staffUserId: staff.staffUserId,
    });
    return NextResponse.json({ ok: true });
  },
);
