import { updateOrderStatus } from "@onwei/core";
import type { OrderStatus } from "@onwei/database";
import { NextResponse } from "next/server";
import { requireStaffSession } from "../../../_lib/requireStaffSession";
import { ORDER_STATUS_LABELS } from "../../../../_lib/orderStatusLabels";

const VALID_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession(request, "order:updateStatus");
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
    note?: unknown;
  } | null;

  const status = VALID_STATUSES.includes(body?.status as OrderStatus)
    ? (body!.status as OrderStatus)
    : null;
  const note = typeof body?.note === "string" ? body.note : undefined;

  if (!status) {
    return NextResponse.json(
      { ok: false, error: "Pick a valid order status." },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(
      { orderId: id, toStatus: status, note },
      { staffUserId: session.context.staffUserId },
    );
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("invalid-transition")
    ) {
      const match = /from (\w+) to (\w+)/.exec(error.message);
      const from = match ? ORDER_STATUS_LABELS[match[1] as OrderStatus] : null;
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
}
