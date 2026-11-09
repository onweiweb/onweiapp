import { clearNeedsAttention } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "order:updateStatus" },
  async ({ staff, params }) => {
    await clearNeedsAttention(params.id, { staffUserId: staff.staffUserId });
    return NextResponse.json({ ok: true });
  },
);
