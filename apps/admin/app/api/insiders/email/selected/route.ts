import {
  getInsiderRecipients,
  logInsiderSelectedSend,
  markInsiderEmailSent,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import {
  insiderSender,
  renderFor,
  sendInsiderWhatsApp,
} from "../../_lib/insiderMail";

// Sends the real Insider email (and WhatsApp) to up to 10 chosen Insiders,
// for checking it end to end before the bulk send. They count as sent, so
// the bulk send skips them. Re-sending to someone who already got it needs
// `resend: true` (the page asks first).
const PAUSE_MS = 600;
export const maxDuration = 60;

const bodySchema = z.object({
  ids: z
    .array(z.string().min(1).max(64))
    .min(1, { error: "Pick at least one Insider." })
    .max(10, { error: "Pick up to 10 Insiders at a time." }),
  resend: z.boolean().default(false),
});

export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ staff, body }) => {
    if (!process.env.INSIDER_LINK_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email links can't be made yet: INSIDER_LINK_SECRET is missing. Ask the developer to add it.",
        },
        { status: 500 },
      );
    }

    const { recipients, skipped } = await getInsiderRecipients(body.ids);
    if (recipients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "None of these can get the email: they unsubscribed or don't have a code yet.",
        },
        { status: 400 },
      );
    }
    if (!body.resend && recipients.some((r) => r.alreadyEmailed)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Some of these already got the email. Confirm to send it again.",
          needsResend: true,
        },
        { status: 409 },
      );
    }

    const sender = insiderSender();
    let sent = 0;
    let failed = 0;
    const whatsapp = { sent: 0, failed: 0, skipped: 0 };
    for (const recipient of recipients) {
      let emailed = false;
      try {
        await sender.send(recipient.email, renderFor(recipient));
        await markInsiderEmailSent(recipient.id);
        sent++;
        emailed = true;
      } catch (error) {
        console.error("[insiders] selected send failed", recipient.id, error);
        failed++;
      }
      if (emailed) whatsapp[await sendInsiderWhatsApp(recipient)]++;
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    }

    await logInsiderSelectedSend(
      { sent, failed, ids: recipients.map((r) => r.id) },
      { staffUserId: staff.staffUserId },
    );
    return NextResponse.json({
      ok: true,
      sent,
      failed,
      skipped,
      whatsappSent: whatsapp.sent,
      whatsappFailed: whatsapp.failed,
    });
  },
);
