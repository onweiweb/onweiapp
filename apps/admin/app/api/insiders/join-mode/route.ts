import { setInsiderJoinMode } from "@onwei/core";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z.object({ mode: z.enum(["OPEN", "INVITE_OR_APPLY"]) });

// How people join Insiders: open signup, or invite and apply only.
export const PATCH = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, staff }) => {
    await setInsiderJoinMode(body.mode, { staffUserId: staff.staffUserId });
    await triggerCatalogRevalidate("site-setting").catch(() => null);
    return NextResponse.json({ ok: true, mode: body.mode });
  },
);
