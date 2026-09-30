import { ConsoleOtpSender } from "@onwei/auth";
import {
  checkOtpRateLimit,
  getClientIp,
  getSiteSetting,
  isValidEmail,
  parseJsonBody,
  requestOtpChallenge,
  validatePhone,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";

const bodySchema = z.object({
  identifier: z.string().trim().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { identifier, channel } = parsed.data;

  if (channel === "EMAIL") {
    if (!isValidEmail(identifier)) return invalidInput();
  } else {
    const { allowInternationalPhone } = await getSiteSetting();
    const phoneResult = validatePhone(identifier, {
      allowInternational: allowInternationalPhone,
    });
    if (!phoneResult.valid) return invalidInput();
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
  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not set");
  }

  const { code, expiresAt } = await requestOtpChallenge(
    {
      identifier,
      channel,
      purpose: "LOGIN",
      requestIp: requestIp ?? undefined,
    },
    secret,
  );

  // ConsoleOtpSender only logs to the server console, no real email/SMS is
  // sent. Check the dev server terminal (or the Vercel function log in
  // production) to read the code during manual testing.
  await new ConsoleOtpSender().send(identifier, channel, code);

  return NextResponse.json({ ok: true, expiresAt });
}
