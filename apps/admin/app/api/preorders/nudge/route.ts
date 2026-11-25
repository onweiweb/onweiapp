import { notifyPreorder, nudgePreorderBalance } from "@onwei/core";
import { NextResponse } from "next/server";
import { runInBackground } from "../../_lib/runInBackground";
import { z } from "zod";
import { defineAdminRoute } from "../../_lib/defineAdminRoute";

export const maxDuration = 60;

const bodySchema = z
  .object({
    /** Chosen orders; leave out with `campaignId` to nudge every open one. */
    orderIds: z.array(z.string().min(1).max(64)).min(1).max(500).optional(),
    campaignId: z.string().min(1).max(64).optional(),
  })
  .refine((b) => b.orderIds || b.campaignId, "Pick the orders to remind.");

// "Send balance nudge": records the time on each reserved order (which ends
// the customer's chance to cancel) and sends the balance email and WhatsApp.
export const POST = defineAdminRoute(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ body, staff }) => {
    const result = await nudgePreorderBalance({
      orderIds: body.orderIds,
      campaignId: body.orderIds ? undefined : body.campaignId,
      actor: { staffUserId: staff.staffUserId },
    });
    const siteUrl = process.env.WEB_APP_URL?.replace(/\/$/, "") || undefined;
    runInBackground(async () => {
      for (const order of result.nudged)
        await notifyPreorder(
          order.orderId,
          { type: "BALANCE", reminder: 0 },
          { siteUrl },
        );
    });
    return NextResponse.json({
      ok: true,
      nudged: result.nudged.length,
      skipped: result.skipped,
    });
  },
);
