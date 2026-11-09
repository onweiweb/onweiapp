import {
  getSiteSetting,
  isValidEmail,
  linkVerifiedContact,
  parseJsonBody,
  validatePhone,
  verifyOtpChallenge,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../../_lib/invalidInput";
import { customerIdFrom } from "../../../_lib/requestAuth";

const bodySchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  code: z.string().trim().min(1).max(12),
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
  let identifier = parsed.data.identifier;
  if (channel === "EMAIL") {
    identifier = identifier.toLowerCase();
    if (!isValidEmail(identifier)) return invalidInput();
  } else {
    const { allowInternationalPhone } = await getSiteSetting();
    const phone = validatePhone(identifier, {
      allowInternational: allowInternationalPhone,
    });
    if (!phone.e164) return invalidInput();
    identifier = phone.e164;
  }
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is not set");
  const result = await verifyOtpChallenge(
    {
      identifier,
      purpose: "SIGNUP",
      code: parsed.data.code.replace(/\s+/g, ""),
    },
    secret,
  );
  if (!result.ok)
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  const linked = await linkVerifiedContact(customerId, channel, identifier);
  if (!linked.ok)
    return NextResponse.json({ ok: false, reason: "TAKEN" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
