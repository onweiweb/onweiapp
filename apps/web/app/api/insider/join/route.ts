import {
  applyToJoin,
  checkWaitlistRateLimit,
  getClientIp,
  getCurrentConsentVersion,
  getInsiderJoinMode,
  getSiteSetting,
  joinByInvite,
  parseJsonBody,
  readGeoHeaders,
  sanitizeAttribution,
  sendInsiderWelcome,
  sendInviteRewardEmails,
  validatePhone,
  verifyOtpChallenge,
} from "@onwei/core";
import { renderInsiderApplicationEmail } from "@onwei/emails";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import {
  runInBackground,
  sendWelcomeEmailInBackground,
} from "../../_lib/sendWelcomeEmail";

// Invite-only Insiders (Insiders page, join mode "invite or apply").
// Path A, INVITE: an Insider's number lets them in at once. Path B, APPLY:
// the application waits for staff. Both need the mobile checked with a code
// (request-otp with purpose SIGNUP) and the consent box ticked.
const bodySchema = z.object({
  path: z.enum(["INVITE", "APPLY"]),
  inviterCode: z.string().trim().max(20).optional(),
  fullName: z.string().max(200).default(""),
  email: z.string().max(254).default(""),
  phone: z.string().max(40).default(""),
  /** The 6-digit code sent to the phone. */
  code: z.string().trim().min(1).max(12),
  activity: z.string().max(200).default(""),
  joinReasons: z.array(z.string().max(80)).max(10).default([]),
  sessionPick: z.string().max(40).nullable().optional(),
  gearWish: z.string().max(600).nullable().optional(),
  consent: z.boolean().optional(),
  // Honeypot: a real visitor never fills this hidden field.
  company: z.string().optional(),
  attribution: z.unknown().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const body = parsed.data;
  if (body.company?.trim()) return NextResponse.json({ ok: true });
  if (body.consent !== true)
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
  if ((await getInsiderJoinMode()) !== "INVITE_OR_APPLY")
    return NextResponse.json(
      { ok: false, reason: "OPEN_SIGNUP" },
      { status: 409 },
    );
  const ip = getClientIp(request) ?? undefined;
  const { allowed } = await checkWaitlistRateLimit(ip ?? "unknown");
  if (!allowed)
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );

  // The mobile number must be the one the code went to.
  const { allowInternationalPhone } = await getSiteSetting();
  const phone = validatePhone(body.phone, {
    allowInternational: allowInternationalPhone,
  });
  if (!phone.valid || !phone.e164)
    return NextResponse.json(
      { ok: false, reason: "INVALID_PHONE" },
      { status: 400 },
    );
  const otpSecret = process.env.OTP_HASH_SECRET;
  if (!otpSecret) throw new Error("OTP_HASH_SECRET is not set");
  const verified = await verifyOtpChallenge(
    {
      identifier: phone.e164,
      purpose: "SIGNUP",
      code: body.code.replace(/\s+/g, ""),
    },
    otpSecret,
  );
  if (!verified.ok)
    return NextResponse.json(
      { ok: false, reason: verified.reason },
      { status: 400 },
    );

  const input = {
    fullName: body.fullName,
    email: body.email,
    phone: phone.e164,
    activity: body.activity,
    joinReasons: body.joinReasons,
    sessionPick: body.sessionPick ?? null,
    gearWish: body.gearWish ?? null,
    consentVersion: `insiders-v2:${await getCurrentConsentVersion(["privacy"])}`,
    ipAddress: ip,
    attribution: sanitizeAttribution(body.attribution),
    geo: readGeoHeaders(request.headers),
    source: body.path === "INVITE" ? "insider_invite" : "insider_application",
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.onwei.in";

  if (body.path === "INVITE") {
    const result = await joinByInvite({
      ...input,
      inviterCode: body.inviterCode ?? "",
    });
    if (!result.ok)
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 400 },
      );
    runInBackground(async () => {
      await sendInsiderWelcome(result.entryId, siteUrl);
      await sendInviteRewardEmails(result.rewards, siteUrl);
    });
    return NextResponse.json({ ok: true, approved: true });
  }

  const result = await applyToJoin(input);
  if (!result.ok)
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  sendWelcomeEmailInBackground(result.email, () =>
    renderInsiderApplicationEmail({ name: result.fullName, siteUrl }),
  );
  return NextResponse.json({ ok: true, approved: false });
}
