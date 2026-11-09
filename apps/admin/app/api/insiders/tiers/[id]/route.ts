import { deleteInsiderTier, updateInsiderTier } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { tierBodySchema, tierErrorMessage } from "../_shared";

export const PATCH = defineAdminRoute<typeof tierBodySchema, { id: string }>(
  { permission: "waitlist:manage", body: tierBodySchema },
  async ({ body, staff, params }) => {
    const result = await updateInsiderTier(params.id, body, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: tierErrorMessage(result) },
        { status: result.reason === "NOT_FOUND" ? 404 : 400 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "waitlist:manage" },
  async ({ staff, params }) => {
    const result = await deleteInsiderTier(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "This tier was already removed. Refresh the page.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  },
);
