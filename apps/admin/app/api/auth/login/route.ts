import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
  verifyPassword,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Enter your email and password." },
      { status: 400 },
    );
  }

  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;
  if (!sessionSecret) {
    throw new Error("ADMIN_SESSION_JWT_SECRET is not set");
  }

  // Same plain-language message whether the email doesn't exist, the
  // account is deactivated, or the password is wrong — never reveal which
  // one it was (that tells an attacker whether an email is a real account).
  const invalidCredentials = NextResponse.json(
    { ok: false, error: "That email or password doesn't match our records." },
    { status: 401 },
  );

  const staffUser = await prisma.staffUser.findUnique({ where: { email } });
  if (!staffUser || !staffUser.isActive) {
    return invalidCredentials;
  }

  const passwordMatches = await verifyPassword(
    password,
    staffUser.passwordHash,
  );
  if (!passwordMatches) {
    return invalidCredentials;
  }

  await prisma.staffUser.update({
    where: { id: staffUser.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createStaffSessionToken(
    { staffUserId: staffUser.id },
    sessionSecret,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
