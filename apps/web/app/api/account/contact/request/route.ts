import {
  checkOtpRateLimit,
  getClientIp,
  getSiteSetting,
  isValidEmail,
  parseJsonBody,
  phoneOtpMode,
  requestOtpChallenge,
  validatePhone,
} from "@onwei/core";
import { createEmailSender, renderOtpEmail } from "@onwei/emails";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../../_lib/invalidInput";
import { customerIdFrom } from "../../../_lib/requestAuth";

// Adding a missing email or phone to an account: a code to the new contact
// first, so only contacts the customer really owns get linked.

const bodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const { channel } = parsed.data;
  const setting = await getSiteSetting();
  let identifier = parsed.data.identifier;
  let fixedCode: string | undefined;
  if (channel === "EMAIL") {
    identifier = identifier.toLowerCase();
    if (!isValidEmail(identifier))
      return NextResponse.json(
        { ok: false, reason: "INVALID_EMAIL" },
        { status: 400 },
      );
  } else {
    const phone = validatePhone(identifier, {
      allowInternational: setting.allowInternationalPhone,
    });
    if (!phone.valid || !phone.e164)
      return NextResponse.json(
        { ok: false, reason: "INVALID_PHONE" },
        { status: 400 },
      );
    identifier = phone.e164;
    const mode = phoneOtpMode({ env: process.env, siteMode: setting.siteMode });
    if (mode.mode === "unavailable")
      return NextResponse.json(
        { ok: false, reason: "PHONE_UNAVAILABLE" },
        { status: 400 },
      );
    fixedCode = mode.code;
  }
  const ip = getClientIp(request);
  if (!(await checkOtpRateLimit(identifier, ip)).allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is not set");
  const { code } = await requestOtpChallenge(
    { identifier, channel, purpose: "SIGNUP", requestIp: ip ?? undefined },
    secret,
    fixedCode,
  );
  if (channel === "EMAIL") {
    try {
      await createEmailSender().send(identifier, renderOtpEmail(code));
    } catch (error) {
      console.error("[account] email code failed", error);
      return NextResponse.json(
        { ok: false, reason: "SEND_FAILED" },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({ ok: true, identifier, resendAfterSeconds: 30 });
}
