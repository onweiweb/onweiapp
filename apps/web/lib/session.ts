import { SESSION_COOKIE_NAME, verifySessionToken } from "@onwei/auth";
import type { SessionPayload } from "@onwei/auth";
import { cookies } from "next/headers";

/** Reads and verifies the session cookie in a Server Component. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) return null;

  return verifySessionToken(token, secret);
}
