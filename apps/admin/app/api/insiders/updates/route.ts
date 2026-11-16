import { saveInsiderUpdate } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../_lib/triggerCatalogRevalidate";
import { updateBodySchema, updateErrorMessage } from "./_shared";

export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: updateBodySchema },
  async ({ body, staff }) => {
    const result = await saveInsiderUpdate(null, body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: updateErrorMessage(result.reason) },
        { status: 400 },
      );
    }
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json(
      { ok: true, id: result.update.id },
      { status: 201 },
    );
  },
);
