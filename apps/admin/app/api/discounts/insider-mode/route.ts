import { updateInsiderStackMode } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({
  mode: z.enum(["ADD", "BEST"], {
    error: "Pick how the Insider discount works with other offers.",
  }),
});

export const PATCH = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, staff }) => {
    await updateInsiderStackMode(body.mode, { staffUserId: staff.staffUserId });
    return NextResponse.json({ ok: true });
  },
);
