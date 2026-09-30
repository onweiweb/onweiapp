import { createCoupon } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../_lib/defineAdminRoute";
import { optionalDate, optionalText, requiredText } from "../_lib/schemas";

// `startsAt`/`endsAt` arrive as ISO date strings (or null to clear them) --
// optionalDate turns them into Date since createCoupon's input type is
// `Date | null`, matching the Prisma column.
const bodySchema = z.object({
  code: requiredText("Enter a coupon code."),
  description: optionalText,
  usageLimit: z.number().nullish(),
  perCustomerLimit: z.number().nullish(),
  minOrderValue: z.number().nullish(),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export const POST = defineAdminRoute(
  {
    permission: "coupon:create",
    body: bodySchema,
    emptyBodyMessage: "Enter a coupon code.",
  },
  async ({ staff, body }) => {
    try {
      const coupon = await createCoupon(
        {
          code: body.code,
          description: body.description ?? null,
          usageLimit: body.usageLimit ?? null,
          perCustomerLimit: body.perCustomerLimit ?? null,
          minOrderValue: body.minOrderValue ?? null,
          startsAt: body.startsAt ?? null,
          endsAt: body.endsAt ?? null,
        },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, coupon }, { status: 201 });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message.includes("Unique constraint")
          ? "That code is already in use, pick a different one."
          : "Couldn't create that coupon.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  },
);
