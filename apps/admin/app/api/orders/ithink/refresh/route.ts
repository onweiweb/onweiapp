import { refreshOrderShipments } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { sendOrderDeliveryEmails } from "../../../_lib/orderDeliveryEmails";
import { ITHINK_NOT_SET_UP } from "../_messages";

export const maxDuration = 60;

// `startedAt`: when this "Update all" began, so each order is asked about
// once per press even across several requests.
const bodySchema = z.object({ startedAt: z.iso.datetime() });

/** One round of "Update all open shipments" (50 orders). */
export const POST = defineAdminRoute(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ body }) => {
    const result = await refreshOrderShipments({
      startedAt: new Date(body.startedAt),
      max: 50,
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
      checked: result.checked,
      changed: result.changed,
      remaining: result.remaining,
    });
  },
);
