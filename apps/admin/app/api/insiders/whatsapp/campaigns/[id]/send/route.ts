import { CAMPAIGN_BATCH_SIZE, sendCampaignBatch } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../../../_lib/defineAdminRoute";
import { webUrl } from "../../../../_lib/insiderMail";

// One batch of a send. The page calls this until everyone is done, or staff
// press Stop. Each member is checked again before their message goes.
const PAUSE_MS = 150;
export const maxDuration = 60;

const bodySchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(CAMPAIGN_BATCH_SIZE),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, params }) => {
    const result = await sendCampaignBatch(
      params.id,
      body.ids,
      { siteUrl: webUrl(), secret: process.env.INSIDER_LINK_SECRET },
      { pauseMs: PAUSE_MS },
    );
    if ("error" in result) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.error === "NOT_FOUND"
              ? "This send isn't there any more. Reload the page."
              : "WhatsApp isn't connected yet. Ask the developer to add the Gupshup settings.",
        },
        { status: result.error === "NOT_FOUND" ? 404 : 400 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
  },
);
