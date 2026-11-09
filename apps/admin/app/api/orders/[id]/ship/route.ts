import { shipOrder } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { actionError } from "../../../_lib/orderActionResponse";

const bodySchema = z.object({
  courierName: z.string().max(60),
  trackingNumber: z.string().max(60),
});

export const POST = defineAdminRoute<typeof bodySchema, { id: string }>(
  { permission: "order:updateStatus", body: bodySchema },
  async ({ staff, body, params }) => {
    try {
      await shipOrder(params.id, body, { staffUserId: staff.staffUserId });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return actionError(error);
    }
  },
);
