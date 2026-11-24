import { refreshOrderShipments } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { sendOrderDeliveryEmails } from "../../../../_lib/orderDeliveryEmails";
import { ITHINK_NOT_SET_UP } from "../../../ithink/_messages";

/** "Get latest update" for one order. */
export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "order:updateStatus" },
  async ({ params }) => {
    const result = await refreshOrderShipments({
      orderId: params.id,
      // Ahead of now, so it's always asked even if checked a moment ago.
      startedAt: new Date(Date.now() + 1000),
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: ITHINK_NOT_SET_UP },
        { status: 503 },
      );
    }
    sendOrderDeliveryEmails(result.events);
    return NextResponse.json({
      ok: true,
      message:
        result.checked === 0
          ? "Nothing to ask iThink about on this order."
          : result.changed > 0
            ? "Updated from iThink."
            : "No change since the last update.",
    });
  },
);
