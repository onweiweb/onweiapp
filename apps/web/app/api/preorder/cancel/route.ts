import {
  checkPreorderActionRateLimit,
  getClientIp,
  cancelPreorder,
  parseJsonBody,
} from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { sendPreorderMessageInBackground } from "../../_lib/orderEmails";
import { customerIdFrom } from "../../_lib/requestAuth";

// The customer cancels their own reservation before paying the balance.
// What they paid becomes a personal credit for a year.
const bodySchema = z.object({ orderNumber: z.string().min(1).max(20) });

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const limits = await Promise.all([
    checkPreorderActionRateLimit(`ip:${getClientIp(request)}`),
    checkPreorderActionRateLimit(`customer:${customerId}`),
  ]);
  if (limits.some((l) => !l.allowed))
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  const order = await prisma.order.findFirst({
    where: { customerId, orderNumber: parsed.data.orderNumber },
    select: { id: true },
  });
  if (!order)
    return NextResponse.json(
      { ok: false, reason: "NOT_FOUND" },
      { status: 404 },
    );
  const result = await cancelPreorder({
    orderId: order.id,
    mode: "CREDIT",
    reason: "Cancelled by the customer",
    customerId,
  });
  if (!result.ok)
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 409 },
    );
  sendPreorderMessageInBackground(result.orderId, { type: "CREDIT" });
  return NextResponse.json({
    ok: true,
    creditCode: result.creditCode,
    amount: result.amount,
    creditEndsAt: result.creditEndsAt,
  });
}
