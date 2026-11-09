import {
  claimInsiderEmailBatch,
  getInsiderOverview,
  logInsiderEmailRun,
  markInsiderEmailSent,
  releaseInsiderEmailClaim,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { insiderSender, renderFor } from "../../_lib/insiderMail";

// One small batch per request, so a long send never hits the request time
// limit. The admin page calls this again until nothing is left.
const BATCH_SIZE = 20;
// Resend allows a few requests a second; stay under it.
const PAUSE_MS = 600;

export const maxDuration = 60;

// `max`: how many this batch may send at most, so the page can stop at the
// day's limit (Resend's free plan allows 100 emails a day).
const bodySchema = z.object({
  max: z.number().int().min(1).max(BATCH_SIZE).default(BATCH_SIZE),
});

export const POST = defineAdminRoute(
  {
    permission: "waitlist:manage",
    body: bodySchema,
    emptyBodyMessage: "Say how many to send.",
  },
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

    const sender = insiderSender();
    const batch = await claimInsiderEmailBatch(Math.min(BATCH_SIZE, body.max));
    let sent = 0;
    let failed = 0;
    for (const recipient of batch) {
      try {
        await sender.send(recipient.email, renderFor(recipient));
        await markInsiderEmailSent(recipient.id);
        sent++;
      } catch (error) {
        console.error("[insiders] send failed", recipient.id, error);
        await releaseInsiderEmailClaim(recipient.id);
        failed++;
      }
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    }

    if (sent + failed > 0) {
      await logInsiderEmailRun(
        { sent, failed },
        { staffUserId: staff.staffUserId },
      );
    }
    const { toEmail } = await getInsiderOverview();
    return NextResponse.json({ ok: true, sent, failed, remaining: toEmail });
  },
);
