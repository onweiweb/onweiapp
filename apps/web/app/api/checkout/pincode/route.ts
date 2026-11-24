import {
  checkDeliveryPincode,
  checkPincodeRateLimit,
  getClientIp,
} from "@onwei/core";
import { NextResponse } from "next/server";

/**
 * Can we deliver to this PIN, and take cash on delivery there? Asked when
 * the shopper moves on from the address step. `known: false` means iThink
 * couldn't tell us, and checkout carries on as normal.
 */
export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get("pin")?.trim() ?? "";
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const ip = getClientIp(request) ?? "unknown";
  if (!(await checkPincodeRateLimit(`ip:${ip}`)).allowed) {
    // Don't block checkout on a busy limiter; the order is checked again.
    return NextResponse.json({ ok: true, known: false });
  }
  const service = await checkDeliveryPincode(pin);
  return NextResponse.json(
    service
      ? {
          ok: true,
          known: true,
          deliverable: service.deliverable,
          cod: service.cod,
        }
      : { ok: true, known: false },
  );
}
