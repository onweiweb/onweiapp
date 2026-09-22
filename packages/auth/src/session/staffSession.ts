import { TextEncoder } from "node:util";
import { jwtVerify, SignJWT } from "jose";

/**
 * Separate from session.ts (the customer session) on purpose: a different
 * cookie name, a different payload, and a different secret
 * (ADMIN_SESSION_JWT_SECRET, never SESSION_JWT_SECRET) — see
 * docs/ARCHITECTURE.md "RBAC and the two kinds of user". A leaked customer
 * session secret must never be usable to forge a staff session.
 */
export const STAFF_SESSION_COOKIE_NAME = "onwei_admin_session";

export interface StaffSessionPayload {
  staffUserId: string;
}

export async function createStaffSessionToken(
  payload: StaffSessionPayload,
  secret: string,
  expiresIn = "12h",
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyStaffSessionToken(
  token: string,
  secret: string,
): Promise<StaffSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (typeof payload.staffUserId !== "string") return null;
    return { staffUserId: payload.staffUserId };
  } catch {
    return null;
  }
}
