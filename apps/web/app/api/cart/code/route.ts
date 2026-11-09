import {
  applyCartCode,
  checkCouponAttemptRateLimit,
  getCartView,
  getClientIp,
  parseJsonBody,
  removeCartCode,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { cartOwnerFrom, setGuestCookie } from "../../_lib/requestAuth";

const bodySchema = z.object({ code: z.string().trim().min(1).max(40) });

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { owner, newGuestToken } = await cartOwnerFrom(request, {
    createGuest: true,
  });

  // Limited per person and per IP so codes can't be guessed.
  const ip = getClientIp(request) ?? "unknown";
  const checks = await Promise.all([
    checkCouponAttemptRateLimit(`ip:${ip}`),
    checkCouponAttemptRateLimit(
      `owner:${owner.customerId ?? owner.guestToken}`,
    ),
  ]);
  if (checks.some((c) => !c.allowed)) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const result = await applyCartCode(owner, parsed.data.code);
  const response = NextResponse.json(
    result.ok
      ? { ok: true, cart: result.view }
      : {
          ok: false,
          reason: result.problem,
          short: result.short,
          blockedBy: result.blockedBy,
          cart: result.view,
        },
    { status: result.ok ? 200 : 400 },
  );
  if (newGuestToken) setGuestCookie(response, newGuestToken);
  return response;
}

export async function DELETE(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { owner } = await cartOwnerFrom(request);
  if (!owner.customerId && !owner.guestToken) return invalidInput();
  await removeCartCode(owner, parsed.data.code);
  return NextResponse.json({ ok: true, cart: await getCartView(owner) });
}
