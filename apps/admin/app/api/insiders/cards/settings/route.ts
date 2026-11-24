import {
  cardParcelSettingsSchema,
  updateCardParcelSettings,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const PATCH = defineAdminRoute(
  { permission: "waitlist:manage", body: cardParcelSettingsSchema },
  async ({ staff, body }) => {
    await updateCardParcelSettings(body, { staffUserId: staff.staffUserId });
    return NextResponse.json({ ok: true });
  },
);
