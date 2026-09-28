import { revokeSessionToken, SESSION_COOKIE_NAME } from "@onwei/auth";
import { NextResponse } from "next/server";

// apps/admin already had a logout route; apps/web (the customer storefront)
// had none at all -- once a customer signed in via OTP there was no way to
// end that session short of the cookie expiring on its own (up to 30 days).
export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  const secret = process.env.SESSION_JWT_SECRET;

  // Revocation is Redis-backed and degrades to a no-op without Upstash
  // configured (see packages/auth/src/session/sessionRevocation.ts) -- the
  // cookie still gets cleared either way, this just also kills the token
  // server-side so a copy that leaked elsewhere stops working immediately.
  if (token && secret) {
    await revokeSessionToken(token, secret);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
