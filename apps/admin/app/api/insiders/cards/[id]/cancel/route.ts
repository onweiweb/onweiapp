import { cancelCardShipment } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { NOT_SET_UP } from "../../_messages";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "waitlist:manage" },
  async ({ staff, params }) => {
    const result = await cancelCardShipment(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (result.ok) return NextResponse.json({ ok: true });
    const error =
      result.reason === "NOT_SET_UP"
        ? NOT_SET_UP
        : result.reason === "NOT_CANCELLABLE"
          ? "This card can't be cancelled now. Only a booked card the courier hasn't picked up yet can be cancelled. Refresh to see its latest status."
          : result.reason === "ITHINK"
            ? `iThink didn't cancel it. ${result.message}`
            : "This card isn't here any more. Refresh the page.";
    return NextResponse.json({ ok: false, error }, { status: 409 });
  },
);
