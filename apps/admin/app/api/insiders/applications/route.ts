import {
  approveApplications,
  rejectApplications,
  sendInsiderWelcome,
  sendInviteRewardEmails,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { runInBackground } from "../../_lib/runInBackground";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";
import { webUrl } from "../_lib/insiderMail";

export const maxDuration = 60;

// The welcome email (Insider code) goes out at once for up to this many
// approvals; the rest wait in Insiders > Email, so a big batch stays inside
// Resend's daily limit and nobody is lost.
const WELCOME_NOW = 20;

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  ids: z
    .array(z.string().min(1).max(64))
    .min(1, { error: "Pick at least one application." })
    .max(200, { error: "Pick up to 200 at a time." }),
});

// Insiders > Applications: approve (code, welcome, invite rewards) or reject.
export const POST = defineAdminRoute(
  { permission: "waitlist:manage", body: bodySchema },
  async ({ body, staff }) => {
    const actor = { staffUserId: staff.staffUserId };
    if (body.action === "reject") {
      const result = await rejectApplications(body.ids, actor);
      return NextResponse.json({
        ok: true,
        rejected: result.rejected,
        skipped: result.skipped,
      });
    }
    const result = await approveApplications(body.ids, actor);
    const now = result.approved.slice(0, WELCOME_NOW);
    const site = webUrl();
    runInBackground(async () => {
      for (const entry of now) await sendInsiderWelcome(entry.entryId, site);
      await sendInviteRewardEmails(result.rewards, site);
    });
    return NextResponse.json({
      ok: true,
      approved: result.approved.length,
      skipped: result.skipped,
      welcomeLater: Math.max(0, result.approved.length - now.length),
    });
  },
);
