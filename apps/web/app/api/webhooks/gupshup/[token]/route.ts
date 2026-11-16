import {
  applyGupshupStatus,
  isStopReply,
  parseGupshupEvent,
  recordWhatsAppOptOut,
  webhookTokenMatches,
} from "@onwei/core";
import { NextResponse } from "next/server";

// Gupshup WhatsApp webhook (set in Gupshup as "Gupshup format, v2"):
// delivery updates for messages we sent, and replies from customers. Gupshup
// doesn't sign these, so the URL carries GUPSHUP_WEBHOOK_TOKEN.
// Replies: STOP or UNSUBSCRIBE opts the number out, anything else is ignored.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!webhookTokenMatches(token, process.env.GUPSHUP_WEBHOOK_TOKEN)) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Gupshup sends an empty test request when the URL is saved.
    return NextResponse.json({ ok: true });
  }

  try {
    const event = parseGupshupEvent(body);
    if (event.kind === "status") {
      await applyGupshupStatus(event);
    } else if (event.kind === "inbound" && isStopReply(event.text)) {
      await recordWhatsAppOptOut(event.phone);
    }
  } catch (error) {
    // Still 200, or Gupshup keeps retrying something we can't fix.
    console.error("[gupshup] webhook handling failed", error);
  }
  return NextResponse.json({ ok: true });
}
