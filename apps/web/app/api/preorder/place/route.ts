import {
  checkPreorderActionRateLimit,
  getClientIp,
  parseJsonBody,
  placePreorder,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom, razorpayConfig } from "../../_lib/requestAuth";
import { quoteView } from "../_shared";

// "Reserve": prices again on the server; a different amount than the
// customer saw creates nothing and sends the new numbers back.

const bodySchema = z.object({
  addressId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10),
  codes: z.array(z.string().max(40)).max(5).default([]),
  expectedReserve: z.number().int().nonnegative(),
  expectedTotal: z.number().int().nonnegative(),
});

export const maxDuration = 30;

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
  const result = await placePreorder({
    customerId,
    ...parsed.data,
    razorpay: razorpayConfig(),
  });
  if (!result.ok)
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        quote: result.quote ? quoteView(result.quote) : null,
      },
      { status: result.reason === "PAYMENT_UNAVAILABLE" ? 503 : 409 },
    );
  return NextResponse.json(result);
}
