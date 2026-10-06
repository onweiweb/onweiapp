import {
  checkWaitlistRateLimit,
  getSiteSetting,
  getClientIp,
  readGeoHeaders,
  sanitizeAttribution,
  getCurrentConsentVersion,
  parseJsonBody,
  subscribeToWaitlist,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../_lib/invalidInput";
import { sendWelcomeEmailInBackground } from "../_lib/sendWelcomeEmail";
import { renderWaitlistWelcomeEmail } from "@onwei/emails";

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
  // Ticked consent checkbox. Required, enforced below.
  consent: z.boolean().optional(),
  // Where they came from (UTM values, referrer). Untrusted, cleaned below.
  attribution: z.unknown().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const body = parsed.data;

  if (body.company?.trim()) {
    return NextResponse.json({ ok: true, alreadyJoined: false });
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
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
    consentVersion: await getCurrentConsentVersion(["privacy"]),
    ipAddress: ip,
    attribution: sanitizeAttribution(body.attribution),
    geo: readGeoHeaders(request.headers),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }

  if (!result.alreadyJoined) {
    const { fullName, email } = result;
    sendWelcomeEmailInBackground(email, async () => {
      const settings = await getSiteSetting().catch(() => null);
      return renderWaitlistWelcomeEmail({
        fullName,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        instagramUrl: settings?.instagramUrl ?? null,
      });
    });
  }

  return NextResponse.json({ ok: true, alreadyJoined: result.alreadyJoined });
}
