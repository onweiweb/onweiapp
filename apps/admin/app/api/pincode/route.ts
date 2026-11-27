import { checkDeliveryPincode } from "@onwei/core";
import { NextResponse } from "next/server";
import { defineAdminRoute } from "../_lib/defineAdminRoute";

// City and state for a PIN (iThink), to fill empty fields when staff edit an
// Insider card address. Unknown or no answer: `known: false`.
export const GET = defineAdminRoute(
  { permission: "waitlist:manage" },
  async ({ request }) => {
    const pin = new URL(request.url).searchParams.get("pin")?.trim() ?? "";
    const service = /^[1-9]\d{5}$/.test(pin)
      ? await checkDeliveryPincode(pin)
      : null;
    return NextResponse.json(
      service
        ? { ok: true, known: true, city: service.city, state: service.state }
        : { ok: true, known: false },
    );
  },
);
