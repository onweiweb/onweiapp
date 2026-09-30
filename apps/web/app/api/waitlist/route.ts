import {
  checkWaitlistRateLimit,
  getClientIp,
  parseJsonBody,
  subscribeToWaitlist,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../_lib/invalidInput";

const CONSENT_VERSION = "2026-09-01";

// Shape only. Whether a name/email/phone is acceptable is decided by
// subscribeToWaitlist, which answers with the INVALID_* reasons the form
// already maps to copy.
const bodySchema = z.object({
  fullName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  movementFlex: z.number().optional(),
  // Honeypot, a real visitor never fills this hidden field. Present and
  // non-empty means a bot; pretend success without creating a row.
  company: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const body = parsed.data;

  if (body.company?.trim()) {
    return NextResponse.json({ ok: true, alreadyJoined: false });
  }

  const ip = getClientIp(request) ?? undefined;
  const { allowed } = await checkWaitlistRateLimit(ip ?? "unknown");
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const result = await subscribeToWaitlist({
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    movementFlex: body.movementFlex,
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
