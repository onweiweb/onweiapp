import { updateInsiderDefaultPercent } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  percent: z.number({ error: "Enter a whole number from 1 to 90." }),
});

export const PATCH = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, staff }) => {
    const result = await updateInsiderDefaultPercent(body.percent, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Enter a whole number from 1 to 90." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
