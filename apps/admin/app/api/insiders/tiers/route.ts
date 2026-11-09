import { createInsiderTier } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { tierBodySchema, tierErrorMessage } from "./_shared";

export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: tierBodySchema },
  async ({ body, staff }) => {
    const result = await createInsiderTier(body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: tierErrorMessage(result) },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
