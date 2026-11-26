import {
  handleIthinkWebhook,
  parseIthinkWebhook,
  webhookTokenMatches,
} from "@onwei/core";
import { NextResponse, after } from "next/server";
import { sendOrderDeliveryEmails } from "../../_lib/orderDeliveryEmails";

// iThink courier status pushes (iThink webhook, Authorization "Bearer Token"
// set to ITHINK_WEBHOOK_TOKEN). The push only says which tracking numbers
// changed: each is re-checked with iThink's Track Order before anything
// moves, through the same code as admin's "Update from iThink" buttons.

export const maxDuration = 60;

function bearerOf(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

export async function POST(request: Request) {
  if (
    !webhookTokenMatches(bearerOf(request), process.env.ITHINK_WEBHOOK_TOKEN)
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // An empty test request when the webhook is saved.
    return NextResponse.json({ ok: true });
  }

  const awbs = parseIthinkWebhook(body);
  if (awbs.length > 0) {
    // Answer at once so iThink doesn't time out and resend; the Track Order
    // calls and emails run after the response.
    after(async () => {
      try {
        const result = await handleIthinkWebhook(awbs);
        if (!result.ok) console.error("[ithink] webhook: iThink not set up");
        await sendOrderDeliveryEmails(result.events);
      } catch (error) {
        // The buttons in admin still pick it up later.
        console.error("[ithink] webhook handling failed", error);
      }
    });
  }
  return NextResponse.json({ ok: true });
}
