import { createManualReview } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { optionalText } from "../_lib/schemas";

const MESSAGE = "Pick who it's for, a rating from 1-5, and write the review.";

const bodySchema = z
  .object({
    targetType: z.enum(["PRODUCT", "BRAND"], { error: MESSAGE }),
    productId: z.string().nullish(),
    rating: z
      .number({ error: MESSAGE })
      .min(1, { error: MESSAGE })
      .max(5, { error: MESSAGE }),
    title: optionalText,
    body: z.string({ error: MESSAGE }).trim().min(1, { error: MESSAGE }),
    authorDisplay: optionalText,
  })
  .refine((value) => value.targetType !== "PRODUCT" || value.productId, {
    error: "Pick which product this review is for.",
    path: ["productId"],
  });

export const POST = defineAdminRoute(
  {
    permission: "review:createManual",
    body: bodySchema,
    emptyBodyMessage: MESSAGE,
  },
  async ({ staff, body }) => {
    try {
      const review = await createManualReview(
        {
          targetType: body.targetType,
          productId: body.productId ?? null,
          rating: body.rating,
          title: body.title ?? null,
          body: body.body,
          authorDisplay: body.authorDisplay ?? null,
        },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, review }, { status: 201 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't add that review." },
        { status: 400 },
      );
    }
  },
);
