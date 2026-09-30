import { setReviewPlacement } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

const bodySchema = z
  .object({
    surface: z.enum(["HOME_HERO", "HOME_WALL", "PRODUCT_WALL"], {
      error: "Choose a valid surface.",
    }),
    productId: z.string().nullish(),
    reviewId: z
      .string({ error: "Choose a review to feature." })
      .min(1, { error: "Choose a review to feature." }),
  })
  .refine((value) => value.surface !== "PRODUCT_WALL" || value.productId, {
    error: "A product wall placement needs a product.",
    path: ["productId"],
  });

export const POST = defineAdminRoute(
  {
    permission: "review:feature",
    body: bodySchema,
    emptyBodyMessage: "Missing review placement details.",
  },
  async ({ staff, body }) => {
    try {
      const placement = await setReviewPlacement(
        {
          surface: body.surface,
          productId: body.surface === "PRODUCT_WALL" ? body.productId! : null,
          reviewId: body.reviewId,
        },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, placement }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.startsWith("already-featured")
          ? "That review is already featured on this surface."
          : "Couldn't feature that review.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
