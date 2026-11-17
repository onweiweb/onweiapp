import {
  checkOtpRateLimit,
  getClientIp,
  getSiteSetting,
  isValidEmail,
  parseJsonBody,
  requestOtpChallenge,
  validatePhone,
} from "@onwei/core";
import { createEmailSender, renderOtpEmail } from "@onwei/emails";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import {
  phoneCodeMode,
  sendSmsSignInCode,
  sendWhatsAppCode,
} from "../../_lib/phoneCode";

// Sign-in codes. Email: a real code by email (Resend). SMS: a real code
// through MSG91 once its settings are in place. WhatsApp: a real code through
// Gupshup once its sign-in template is on in admin. Before that, SMS and
// WhatsApp use a static code from OTP_STATIC_CODE, refused on the live
// production site (packages/core/src/otp/staticOtp.ts).

const bodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
});

const RESEND_AFTER_SECONDS = 30;

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { channel } = parsed.data;
  let identifier = parsed.data.identifier;

  const setting = await getSiteSetting();
  if (channel === "EMAIL") {
    identifier = identifier.toLowerCase();
    if (!isValidEmail(identifier)) {
      return NextResponse.json(
        { ok: false, reason: "INVALID_EMAIL" },
        { status: 400 },
      );
    }
  } else {
    const phone = validatePhone(identifier, {
      allowInternational: setting.allowInternationalPhone,
    });
    if (!phone.valid || !phone.e164) {
      return NextResponse.json(
        { ok: false, reason: "INVALID_PHONE" },
        { status: 400 },
      );
    }
    identifier = phone.e164;
  }

  let fixedCode: string | undefined;
  let viaWhatsApp = false;
  let viaSms = false;
  if (channel !== "EMAIL") {
    const mode = await phoneCodeMode(channel, setting.siteMode);
    if (mode.mode === "unavailable") {
      return NextResponse.json(
        { ok: false, reason: "PHONE_UNAVAILABLE" },
        { status: 400 },
      );
    }
    if (mode.mode === "static") fixedCode = mode.code;
    else if (mode.mode === "sms") viaSms = true;
    else viaWhatsApp = true;
  }

  const requestIp = getClientIp(request);
  const { allowed } = await checkOtpRateLimit(identifier, requestIp);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is not set");

  const { code, expiresAt } = await requestOtpChallenge(
    {
      identifier,
      channel,
      purpose: "LOGIN",
      requestIp: requestIp ?? undefined,
    },
    secret,
    fixedCode,
  );

  if (channel === "EMAIL") {
    try {
      await createEmailSender().send(identifier, renderOtpEmail(code));
    } catch (error) {
      console.error("[otp] email send failed", error);
      return NextResponse.json(
        { ok: false, reason: "SEND_FAILED" },
        { status: 502 },
      );
    }
  }
  if (viaSms && !(await sendSmsSignInCode(identifier, code))) {
    return NextResponse.json(
      { ok: false, reason: "SMS_SEND_FAILED" },
      { status: 502 },
    );
  }
  if (viaWhatsApp && !(await sendWhatsAppCode(identifier, code))) {
    return NextResponse.json(
      { ok: false, reason: "WHATSAPP_SEND_FAILED" },
      { status: 502 },
    );
  }
  // Static code (SMS or WhatsApp before they are set up): nothing is sent.

  return NextResponse.json({
    ok: true,
    identifier,
    expiresAt,
    resendAfterSeconds: RESEND_AFTER_SECONDS,
  });
}
