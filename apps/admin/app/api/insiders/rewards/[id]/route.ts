import { deleteInviteRewardRule, saveInviteRewardRule } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { rewardSchema } from "../_schema";

export const PATCH = defineAdminRoute<typeof rewardSchema, { id: string }>(
  { permission: "waitlist:manage", body: rewardSchema },
  async ({ body, staff, params }) => {
    const result = await saveInviteRewardRule(
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

// Switches the rule off. Rewards already given keep working.
export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "waitlist:manage" },
  async ({ staff, params }) => {
    const ok = await deleteInviteRewardRule(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (!ok)
      return NextResponse.json(
        { ok: false, error: "This reward no longer exists." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  },
);
