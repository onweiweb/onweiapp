import { rejectReview } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { triggerCatalogRevalidate } from "../../../_lib/triggerCatalogRevalidate";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "review:moderate" },
  async ({ staff, params }) => {
    try {
      const review = await rejectReview(params.id, {
        staffUserId: staff.staffUserId,
      });
      await triggerCatalogRevalidate();
      return NextResponse.json({ ok: true, review });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't find that review." },
        { status: 404 },
      );
    }
  },
);
