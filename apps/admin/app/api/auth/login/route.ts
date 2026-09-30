import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
  verifyPassword,
} from "@onwei/auth";
import {
  checkStaffLoginRateLimit,
  getClientIp,
  parseJsonBody,
} from "@onwei/core";
import { prisma } from "@onwei/database";
import { NextResponse } from "next/server";
import { z } from "zod";

const MISSING_CREDENTIALS = "Enter your email and password.";

const bodySchema = z.object({
  email: z
    .string({ error: MISSING_CREDENTIALS })
    .trim()
    .toLowerCase()
    .min(1, { error: MISSING_CREDENTIALS }),
  password: z
    .string({ error: MISSING_CREDENTIALS })
    .min(1, { error: MISSING_CREDENTIALS }),
});

const missingCredentials = NextResponse.json(
  { ok: false, error: MISSING_CREDENTIALS },
  { status: 400 },
);

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return missingCredentials;
  const { email, password } = parsed.data;

  const requestIp = getClientIp(request);
  const { allowed } = await checkStaffLoginRateLimit(email, requestIp);
  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many sign-in attempts. Wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;
  if (!sessionSecret) {
    throw new Error("ADMIN_SESSION_JWT_SECRET is not set");
  }

  // Same plain-language message whether the email doesn't exist, the
  // account is deactivated, or the password is wrong, never reveal which
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
