import { createSessionToken, SESSION_COOKIE_NAME } from "@onwei/auth";
import {
  getClientIp,
  getCurrentConsentVersion,
  parseJsonBody,
  verifyOtpAndAuthenticate,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { renderCustomerWelcomeEmail } from "@onwei/emails";
import { invalidInput } from "../../_lib/invalidInput";
import { sendWelcomeEmailInBackground } from "../../_lib/sendWelcomeEmail";

const bodySchema = z.object({
  identifier: z.string().trim().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  code: z.string().trim().min(1),
  // Ticked "I accept the Terms and Privacy Policy" box. Required.
  consent: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { identifier, channel, code, consent } = parsed.data;
  if (consent !== true) {
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
  }

  const otpSecret = process.env.OTP_HASH_SECRET;
  const sessionSecret = process.env.SESSION_JWT_SECRET;
  if (!otpSecret || !sessionSecret) {
    throw new Error("OTP_HASH_SECRET or SESSION_JWT_SECRET is not set");
  }

  const result = await verifyOtpAndAuthenticate(
    { identifier, purpose: "LOGIN", code, channel },
    otpSecret,
    {
      version: await getCurrentConsentVersion(["privacy", "terms"]),
      ipAddress: getClientIp(request) ?? undefined,
    },
  );

  if (!result.ok) {
    // Never leak attempts/hash details, just the reason.
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }

  if (result.isNewCustomer && result.email) {
    const { email, name } = result;
    sendWelcomeEmailInBackground(email, () =>
      renderCustomerWelcomeEmail({
        name,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      }),
    );
  }

  const token = await createSessionToken(
    { customerId: result.customerId! },
    sessionSecret,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
