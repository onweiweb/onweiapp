import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { isRevoked, revoke } from "./sessionRevocation";

/**
 * Separate from session.ts (the customer session) on purpose: a different
 * cookie name, a different payload, and a different secret
 * (ADMIN_SESSION_JWT_SECRET, never SESSION_JWT_SECRET) — see
 * docs/ARCHITECTURE.md "RBAC and the two kinds of user". A leaked customer
 * session secret must never be usable to forge a staff session. Revocation
 * uses its own key prefix in sessionRevocation.ts for the same reason: a
 * revoked staff session must never look "not found" for a customer one.
 */
export const STAFF_SESSION_COOKIE_NAME = "onwei_admin_session";
const REVOCATION_PREFIX = "staff-session";

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
    .setJti(randomUUID())
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

    if (typeof payload.jti === "string") {
      if (await isRevoked(REVOCATION_PREFIX, payload.jti)) return null;
    }

    return { staffUserId: payload.staffUserId };
  } catch {
    return null;
  }
}

/** See session.ts's revokeSessionToken -- same idea, staff session. */
export async function revokeStaffSessionToken(
  token: string,
  secret: string,
): Promise<void> {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret),
  ).catch(() => ({ payload: null }));
  if (!payload || typeof payload.jti !== "string") return;

  const ttlSeconds =
    typeof payload.exp === "number"
      ? payload.exp - Math.floor(Date.now() / 1000)
      : 60 * 60 * 12;
  await revoke(REVOCATION_PREFIX, payload.jti, ttlSeconds);
}
