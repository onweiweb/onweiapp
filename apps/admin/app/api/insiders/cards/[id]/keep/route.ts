import { keepCardShipment } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";

export const POST = defineAdminRoute<never, { id: string }>(
  { permission: "waitlist:manage" },
  async ({ staff, params }) => {
    const result = await keepCardShipment(params.id, {
      staffUserId: staff.staffUserId,
    });
    if (result.ok) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { ok: false, error: "Nothing to keep here any more. Refresh the page." },
      { status: 409 },
    );
  },
);
