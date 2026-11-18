import {
  checkPreorderActionRateLimit,
  getClientIp,
  getBalancePayment,
  parseJsonBody,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom, razorpayConfig } from "../../_lib/requestAuth";

// "Pay the balance" on the account order page: the Razorpay order to open.
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
  const payment = await getBalancePayment(
    customerId,
    parsed.data.orderNumber,
    razorpayConfig(),
  ).catch(() => null);
  if (!payment)
    return NextResponse.json({ ok: false, reason: "NOT_DUE" }, { status: 409 });
  return NextResponse.json({ ok: true, razorpay: payment });
}
