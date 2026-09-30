import { updateCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { optionalDate } from "../../_lib/schemas";

// Every field is optional: an omitted field is left alone, null clears it.
const bodySchema = z.object({
  code: z
    .string()
    .trim()
    .optional()
    .transform((code) => code || undefined),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  usageLimit: z.number().nullable().optional(),
  perCustomerLimit: z.number().nullable().optional(),
  minOrderValue: z.number().nullable().optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "coupon:update",
    body: bodySchema,
    emptyBodyMessage: "Nothing to update.",
  },
  async ({ staff, body, params }) => {
    try {
      const coupon = await updateCoupon(params.id, body, {
        staffUserId: staff.staffUserId,
      });
      return NextResponse.json({ ok: true, coupon });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("Unique constraint")
          ? "That code is already in use, pick a different one."
          : "Couldn't find that coupon.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
