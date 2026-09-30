import { updateOrderStatus } from "@onwei/core";
import type { OrderStatus } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { defineAdminRoute } from "../../../_lib/defineAdminRoute";
import { ORDER_STATUS_LABELS } from "../../../../_lib/orderStatusLabels";

const VALID_STATUSES = Object.keys(ORDER_STATUS_LABELS) as [
  OrderStatus,
  ...OrderStatus[],
];

const bodySchema = z.object({
  status: z.enum(VALID_STATUSES, { error: "Pick a valid order status." }),
  note: z.string().optional().catch(undefined),
});

export const PATCH = defineAdminRoute<typeof bodySchema, { id: string }>(
  {
    permission: "order:updateStatus",
    body: bodySchema,
    emptyBodyMessage: "Pick a valid order status.",
  },
  async ({ staff, body, params }) => {
    try {
      const order = await updateOrderStatus(
        { orderId: params.id, toStatus: body.status, note: body.note },
        { staffUserId: staff.staffUserId },
      );
      return NextResponse.json({ ok: true, order });
    } catch (error) {
      console.error(error);
      if (
        error instanceof Error &&
        error.message.startsWith("invalid-transition")
      ) {
        const match = /from (\w+) to (\w+)/.exec(error.message);
        const from = match
          ? ORDER_STATUS_LABELS[match[1] as OrderStatus]
          : null;
        const to = match ? ORDER_STATUS_LABELS[match[2] as OrderStatus] : null;
        return NextResponse.json(
          {
            ok: false,
            error:
              from && to
                ? `You can't move an order from ${from} to ${to}.`
                : "That status change isn't allowed from here.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "Couldn't find that order." },
        { status: 404 },
      );
    }
  },
);
