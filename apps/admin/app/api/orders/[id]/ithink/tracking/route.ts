import { matchTrackingNumbers, refreshOrderShipments } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { sendOrderDeliveryEmails } from "../../../../_lib/orderDeliveryEmails";
import { NOTHING_PASTED } from "../../../../insiders/cards/_tracking";
import { ITHINK_NOT_SET_UP } from "../../../ithink/_messages";

export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().max(2_000) });

/**
 * The order is booked on iThink but its tracking number never reached us:
 * staff paste it from the portal, then the order is updated from iThink.
 */
export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "order:updateStatus",
    body: bodySchema,
    emptyBodyMessage: NOTHING_PASTED,
  },
  async ({ staff, body, params }) => {
    const result = await matchTrackingNumbers(
      { text: body.text, kind: "ORDER", orderId: params.id },
      { staffUserId: staff.staffUserId },
    );
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason === "NOT_SET_UP" ? ITHINK_NOT_SET_UP : NOTHING_PASTED,
        },
        { status: result.reason === "NOT_SET_UP" ? 503 : 400 },
      );
    }
    if (result.matched.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.left[0]?.reason ??
            "That tracking number is already saved on this order.",
        },
        { status: 409 },
      );
    }
    const update = await refreshOrderShipments({
      orderId: params.id,
      startedAt: new Date(Date.now() + 1000),
    });
    if (update.ok) sendOrderDeliveryEmails(update.events);
    return NextResponse.json({
      ok: true,
      message: `Saved tracking number ${result.matched[0]?.awb}. The order is booked on iThink.`,
    });
  },
);
