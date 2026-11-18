import {
  notifyPreorder,
  releaseExpiredOrders,
  runPreorderReminders,
} from "@onwei/core";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Vercel Cron (vercel.json) calls this with "Authorization: Bearer
// CRON_SECRET". Checkout also releases expired holds on every order, so that
// part is only a safety net for quiet periods. It also runs the daily
// pre-order job: balance reminders after 3 and 7 days, and after 14 days the
// reserve becomes a year-long credit.
export const maxDuration = 60;

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
  const preorders = await runPreorderReminders();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  for (const order of preorders.remind)
    await notifyPreorder(
      order.orderId,
      { type: "BALANCE", reminder: order.reminder },
      { siteUrl },
    );
  for (const credit of preorders.creditMade)
    await notifyPreorder(credit.orderId, { type: "CREDIT" }, { siteUrl });
  return NextResponse.json({
    ok: true,
    released,
    reminded: preorders.remind.length,
    creditMade: preorders.creditMade.length,
  });
}
