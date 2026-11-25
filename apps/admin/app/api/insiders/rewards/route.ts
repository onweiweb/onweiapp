import { saveInviteRewardRule } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { rewardSchema } from "./_schema";

// Insiders > Invite rewards: a new "invite N, get X" rule.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: rewardSchema },
  async ({ body, staff }) => {
    const result = await saveInviteRewardRule(body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 },
      );
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  },
);
