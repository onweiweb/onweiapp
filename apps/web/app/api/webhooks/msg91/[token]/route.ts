import {
  applyMsg91Report,
  parseMsg91Reports,
  webhookTokenMatches,
} from "@onwei/core";
import { NextResponse } from "next/server";

// MSG91 delivery reports for SMS sign-in codes (MSG91 > OTP > Webhook,
// event "On Report Received", JSON). MSG91 doesn't sign these, so the URL
// carries MSG91_WEBHOOK_TOKEN.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!webhookTokenMatches(token, process.env.MSG91_WEBHOOK_TOKEN)) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // An empty test request when the webhook is saved.
    return NextResponse.json({ ok: true });
  }

  try {
    for (const report of parseMsg91Reports(body)) {
      await applyMsg91Report(report);
    }
  } catch (error) {
    // Still 200, or MSG91 keeps retrying something we can't fix.
    console.error("[msg91] webhook handling failed", error);
  }
  return NextResponse.json({ ok: true });
}
