import { matchTrackingNumbers } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { NOT_SET_UP } from "../_messages";
import { NOTHING_PASTED, trackingReply } from "../_tracking";

// Up to 100 tracking numbers, read from iThink 10 at a time.
export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().max(20_000),
  /** One card only (the button on its row). */
  addressId: z.string().min(1).optional(),
});

/**
 * "Add tracking numbers": cards iThink booked but whose tracking number
 * never reached us, matched by the reference iThink holds for each.
 */
export const POST = defineAdminRoute(
  {
    permission: "waitlist:manage",
    body: bodySchema,
    emptyBodyMessage: NOTHING_PASTED,
  },
  async ({ staff, body }) => {
    const result = await matchTrackingNumbers(
      {
        text: body.text,
        kind: "INSIDER_CARD",
        insiderCardAddressId: body.addressId,
      },
      { staffUserId: staff.staffUserId },
    );
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.reason === "NOT_SET_UP" ? NOT_SET_UP : NOTHING_PASTED,
        },
        { status: result.reason === "NOT_SET_UP" ? 503 : 400 },
      );
    }
    return NextResponse.json(
      trackingReply(result, { one: "card", many: "cards" }),
    );
  },
);
