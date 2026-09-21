import { ConsoleOtpSender } from "@onwei/auth";
import type { OtpChannel } from "@onwei/auth";
import { requestOtpChallenge } from "@onwei/core";
import { NextResponse } from "next/server";

function isOtpChannel(value: unknown): value is OtpChannel {
  return value === "EMAIL" || value === "SMS";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: unknown;
    channel?: unknown;
  } | null;

  const identifier =
    typeof body?.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier || !isOtpChannel(body?.channel)) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const channel = body.channel;

  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not set");
  }

  const { code, expiresAt } = await requestOtpChallenge(
    { identifier, channel, purpose: "LOGIN" },
    secret,
  );

  // ConsoleOtpSender only logs to the server console — no real email/SMS is
  // sent. Check the dev server terminal (or the Vercel function log in
  // production) to read the code during manual testing.
  await new ConsoleOtpSender().send(identifier, channel, code);

  return NextResponse.json({ ok: true, expiresAt });
}
