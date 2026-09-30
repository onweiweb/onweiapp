import { removeReviewPlacement } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

export const DELETE = defineAdminRoute<never, { id: string }>(
  { permission: "review:feature" },
  async ({ staff, params }) => {
    try {
      await removeReviewPlacement(params.id, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that placement." },
        { status: 404 },
      );
    }
  },
);
