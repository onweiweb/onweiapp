import { getRetryPayment, parseJsonBody } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom, razorpayConfig } from "../../_lib/requestAuth";

const bodySchema = z.object({ orderNumber: z.string().min(1).max(40) });

/** "Try payment again" on an order that's still within its hold. */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  }
  const retry = await getRetryPayment(
    customerId,
    parsed.data.orderNumber,
    razorpayConfig(),
  );
  if (!retry) {
    return NextResponse.json({ ok: false, reason: "EXPIRED" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, razorpay: retry });
}
