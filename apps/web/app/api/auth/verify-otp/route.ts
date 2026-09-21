import { createSessionToken, SESSION_COOKIE_NAME } from "@onwei/auth";
import type { OtpChannel } from "@onwei/auth";
import { verifyOtpAndAuthenticate } from "@onwei/core";
import { NextResponse } from "next/server";

function isOtpChannel(value: unknown): value is OtpChannel {
  return value === "EMAIL" || value === "SMS";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: unknown;
    channel?: unknown;
    code?: unknown;
  } | null;

  const identifier =
    typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!identifier || !code || !isOtpChannel(body?.channel)) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const channel = body.channel;

  const otpSecret = process.env.OTP_HASH_SECRET;
  const sessionSecret = process.env.SESSION_JWT_SECRET;
  if (!otpSecret || !sessionSecret) {
    throw new Error("OTP_HASH_SECRET or SESSION_JWT_SECRET is not set");
  }

  const result = await verifyOtpAndAuthenticate(
    { identifier, purpose: "LOGIN", code, channel },
    otpSecret,
  );

  if (!result.ok) {
    // Never leak attempts/hash details — just the reason.
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
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
