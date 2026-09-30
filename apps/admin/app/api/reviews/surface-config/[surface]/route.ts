import { updateReviewSurfaceLimit } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";

const surfaceSchema = z.enum(["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"]);

const LIMIT_MESSAGE = "Enter a whole number of at least 1.";

const bodySchema = z.object({
  limit: z
    .number({ error: LIMIT_MESSAGE })
    .int({ error: LIMIT_MESSAGE })
    .min(1, { error: LIMIT_MESSAGE }),
  productId: z.string().nullish(),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { surface: string }>(
  {
    permission: "review:feature",
    body: bodySchema,
    emptyBodyMessage: LIMIT_MESSAGE,
  },
  async ({ staff, body, params }) => {
    const surface = surfaceSchema.safeParse(params.surface);
    if (!surface.success) {
      return NextResponse.json(
        { ok: false, error: "Unknown surface." },
        { status: 400 },
      );
    }

    const config = await updateReviewSurfaceLimit(
      surface.data,
      body.limit,
      { staffUserId: staff.staffUserId },
      body.productId ?? null,
    );
    return NextResponse.json({ ok: true, config });
  },
);
