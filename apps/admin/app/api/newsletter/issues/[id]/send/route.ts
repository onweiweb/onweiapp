import { NEWSLETTER_BATCH_SIZE, sendNewsletterBatch } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../_lib/defineAdminRoute";
import { webUrl } from "../../../../insiders/_lib/insiderMail";

export const maxDuration = 60;

const bodySchema = z.object({
  max: z.number().int().min(1).max(NEWSLETTER_BATCH_SIZE),
});

/** Sends the next batch (the page keeps calling until done or the day's limit). */
export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "newsletter:manage", body: bodySchema },
  async ({ staff, body, params }) => {
    if (!process.env.INSIDER_LINK_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsubscribe links can't be made: INSIDER_LINK_SECRET isn't set on this site.",
        },
        { status: 503 },
      );
    }
    const result = await sendNewsletterBatch(
      params.id,
      body.max,
      { staffUserId: staff.staffUserId },
      { siteUrl: webUrl(), secret: process.env.INSIDER_LINK_SECRET },
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.message },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  },
);
