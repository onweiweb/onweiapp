import { savePreorderCampaign } from "@onwei/core";
import { NextResponse } from "next/server";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { campaignSchema } from "./_schema";

export const POST = defineAdminRoute(
  { permission: "coupon:update", body: campaignSchema },
  async ({ body, staff }) => {
    const result = await savePreorderCampaign(body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, errors: result.errors },
        { status: 400 },
      );
    // The campaign decides what the storefront lists in pre-order mode.
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  },
);
