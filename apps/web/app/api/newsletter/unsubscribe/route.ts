import {
  checkInsiderLinkRateLimit,
  getClientIp,
  unsubscribeNewsletter,
} from "@onwei/core";
import { NextResponse } from "next/server";

/**
 * Newsletter one-click unsubscribe (RFC 8058): mail apps POST here using the
 * List-Unsubscribe header, and the unsubscribe page's button does too. POST
 * only, so link scanners that open URLs can't unsubscribe anyone.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const ip = getClientIp(request) ?? "unknown";
  if (!(await checkInsiderLinkRateLimit(ip)).allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }
  const result = await unsubscribeNewsletter(
    token,
    process.env.INSIDER_LINK_SECRET,
  );
  if (result !== "DONE") {
    return NextResponse.json(
      { ok: false, reason: "LINK_INVALID" },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
