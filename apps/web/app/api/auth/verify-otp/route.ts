import { createSessionToken, SESSION_COOKIE_NAME } from "@onwei/auth";
import {
  getClientIp,
  getCurrentConsentVersion,
  getSiteSetting,
  isValidEmail,
  mergeGuestCart,
  parseJsonBody,
  validatePhone,
  verifyOtpAndAuthenticate,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { renderCustomerWelcomeEmail } from "@onwei/emails";
import { invalidInput } from "../../_lib/invalidInput";
import { sendWelcomeEmailInBackground } from "../../_lib/sendWelcomeEmail";
import {
  clearGuestCookie,
  GUEST_CART_COOKIE,
  readCookie,
} from "../../_lib/requestAuth";

const bodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  code: z.string().trim().min(1).max(12),
  // Ticked "I accept the Terms and Privacy Policy" box. Required.
  consent: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { channel, code, consent } = parsed.data;
  if (consent !== true) {
    return NextResponse.json(
      { ok: false, reason: "CONSENT_REQUIRED" },
      { status: 400 },
    );
  }

  // Same normalising as request-otp, so the code is found.
  let identifier = parsed.data.identifier;
  if (channel === "EMAIL") {
    identifier = identifier.toLowerCase();
    if (!isValidEmail(identifier)) return invalidInput();
  } else {
    const { allowInternationalPhone } = await getSiteSetting();
    const phone = validatePhone(identifier, {
      allowInternational: allowInternationalPhone,
    });
    if (!phone.valid || !phone.e164) return invalidInput();
    identifier = phone.e164;
  }

  const otpSecret = process.env.OTP_HASH_SECRET;
  const sessionSecret = process.env.SESSION_JWT_SECRET;
  if (!otpSecret || !sessionSecret) {
    throw new Error("OTP_HASH_SECRET or SESSION_JWT_SECRET is not set");
  }

  const result = await verifyOtpAndAuthenticate(
    { identifier, purpose: "LOGIN", code: code.replace(/\s+/g, ""), channel },
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

  // Anything added to the bag before signing in comes along.
  const guestToken = readCookie(request, GUEST_CART_COOKIE);
  if (guestToken) {
    try {
      await mergeGuestCart(guestToken, result.customerId!);
    } catch (error) {
      console.error("[auth] guest cart merge failed", error);
    }
  }

  const token = await createSessionToken(
    { customerId: result.customerId! },
    sessionSecret,
  );
  const response = NextResponse.json({
    ok: true,
    isNewCustomer: Boolean(result.isNewCustomer),
    needsName: !result.name,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  if (guestToken) clearGuestCookie(response);
  return response;
}
