import { reorderReviewPlacements } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const bodySchema = z.object({
  surface: z.enum(["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"], {
    error: "Choose a valid surface.",
  }),
  productId: z.string().nullish(),
  orderedPlacementIds: z.array(z.string(), { error: "Missing the new order." }),
});

export const POST = defineAdminRoute(
  {
    permission: "review:feature",
    body: bodySchema,
    emptyBodyMessage: "Missing reorder details.",
  },
  async ({ staff, body }) => {
    try {
      await reorderReviewPlacements(
        body.surface,
        body.productId ?? null,
        body.orderedPlacementIds,
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the new order." },
        { status: 400 },
      );
    }
  },
);
