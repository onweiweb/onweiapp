import {
  checkCouponAttemptRateLimit,
  getClientIp,
  parseJsonBody,
  quotePreorder,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom } from "../../_lib/requestAuth";
import { quoteView } from "../_shared";

const bodySchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10),
  codes: z.array(z.string().max(40)).max(5).default([]),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (parsed.data.codes.length) {
    const ip = getClientIp(request);
    const checks = await Promise.all([
      checkCouponAttemptRateLimit(`ip:${ip}`),
      checkCouponAttemptRateLimit(`owner:${customerId ?? ip}`),
    ]);
    if (checks.some((c) => !c.allowed))
      return NextResponse.json(
        { ok: false, reason: "RATE_LIMITED" },
        { status: 429 },
      );
  }
  const result = await quotePreorder({ ...parsed.data, customerId });
  if (!result.ok)
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 409 },
    );
  return NextResponse.json({ ok: true, quote: quoteView(result.quote) });
}
