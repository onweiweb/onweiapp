import { releaseExpiredOrders } from "@onwei/core";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Vercel Cron (vercel.json) calls this with "Authorization: Bearer
// CRON_SECRET". Checkout also releases expired holds on every order, so this
// is only a safety net for quiet periods.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const given = Buffer.from(header);
  if (
    !secret ||
    expected.length !== given.length ||
    !timingSafeEqual(expected, given)
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const released = await releaseExpiredOrders();
  return NextResponse.json({ ok: true, released });
}
