import { savePreorderCampaign } from "@onwei/core";
import { NextResponse } from "next/server";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { campaignSchema } from "../_schema";

export const PATCH = defineAdminRoute<typeof campaignSchema, { id: string }>(
  { permission: "coupon:update", body: campaignSchema },
  async ({ body, staff, params }) => {
    const result = await savePreorderCampaign(
      body,
      { staffUserId: staff.staffUserId },
      params.id,
    );
    if (!result.ok)
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 },
      );
    // The campaign decides what the storefront lists in pre-order mode.
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true, id: result.id });
  },
);
