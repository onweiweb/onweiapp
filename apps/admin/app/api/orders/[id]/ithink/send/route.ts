import { sendOrderToIthink } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { ITHINK_NOT_SET_UP } from "../../../ithink/_messages";

export const maxDuration = 60;

const REFUSALS = {
  NOT_SET_UP: ITHINK_NOT_SET_UP,
  NOT_FOUND: "This order isn't here any more. Refresh the page.",
  NOT_READY: "Only confirmed or packed orders can go to iThink.",
  ALREADY_SENT: "This order is already booked on iThink. Refresh the page.",
  BUSY: "Someone else just sent this order. Refresh the page.",
} as const;

/** Send to iThink, send again, or "Check again" after no reply. */
export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "order:updateStatus" },
  async ({ staff, params }) => {
    const result = await sendOrderToIthink(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: REFUSALS[result.reason] },
        { status: 409 },
      );
    }
    if (result.outcome === "BOOKED") {
      return NextResponse.json({
        ok: true,
        message: `Booked on iThink, tracking number ${result.awb}. Print the label in the iThink portal.`,
      });
    }
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: 409 },
    );
  },
);
