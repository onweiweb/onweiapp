import { deleteInsiderUpdate, saveInsiderUpdate } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";
import { updateBodySchema, updateErrorMessage } from "../_shared";

export const PATCH = defineAdminRoute<typeof updateBodySchema, { id: string }>(
  { permission: "waitlist:manage", body: updateBodySchema },
  async ({ body, staff, params }) => {
    const result = await saveInsiderUpdate(params.id, body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: updateErrorMessage(result.reason) },
        { status: result.reason === "NOT_FOUND" ? 404 : 400 },
      );
    }
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true });
  },
);

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "waitlist:manage" },
  async ({ staff, params }) => {
    const removed = await deleteInsiderUpdate(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (!removed) {
      return NextResponse.json(
        { ok: false, error: updateErrorMessage("NOT_FOUND") },
        { status: 404 },
      );
    }
    await triggerCatalogRevalidate("site-setting");
    return NextResponse.json({ ok: true });
  },
);
