import { checkWaitlistRateLimit, subscribeToWaitlist } from "@onwei/core";
import { NextResponse } from "next/server";

const CONSENT_VERSION = "2026-09-01";

function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    fullName?: unknown;
    email?: unknown;
    phone?: unknown;
    movementFlex?: unknown;
    // Honeypot — a real visitor never fills this hidden field. Present and
    // non-empty means a bot; pretend success without creating a row.
    company?: unknown;
  } | null;

  if (typeof body?.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true, alreadyJoined: false });
  }

  const ip = getClientIp(request);
  const { allowed } = await checkWaitlistRateLimit(ip ?? "unknown");
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const fullName = typeof body?.fullName === "string" ? body.fullName : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const movementFlex =
    typeof body?.movementFlex === "number" ? body.movementFlex : undefined;

  const result = await subscribeToWaitlist({
    fullName,
    email,
    phone,
    movementFlex,
    source: "coming_soon_page",
    consentVersion: CONSENT_VERSION,
    ipAddress: ip,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, alreadyJoined: result.alreadyJoined });
}
