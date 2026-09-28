import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { isRevoked, revoke } from "./sessionRevocation";

/**
 * TEMPORARY PLACEHOLDER: root CLAUDE.md's tech stack table calls out
 * Redis-backed sessions (Upstash) as the eventual approach for "OTP
 * throttling, sessions, caching." This stateless, jose-signed httpOnly JWT
 * cookie is an explicitly-approved stand-in for the dummy OTP flow, isolated
 * behind these functions so swapping to Redis later touches one file, not
 * every call site. Revocation (revokeSessionToken) is the first piece of
 * that: each token carries a `jti`, checked against sessionRevocation.ts's
 * Redis-backed list on every verify.
 */
export const SESSION_COOKIE_NAME = "onwei_session";
const REVOCATION_PREFIX = "session";

export interface SessionPayload {
  customerId: string;
}

export async function createSessionToken(
  payload: SessionPayload,
  secret: string,
  expiresIn = "30d",
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (typeof payload.customerId !== "string") return null;

    if (typeof payload.jti === "string") {
      if (await isRevoked(REVOCATION_PREFIX, payload.jti)) return null;
    }

    return { customerId: payload.customerId };
  } catch {
    return null;
  }
}

/**
 * Revokes a session token's jti so it stops verifying immediately, even
 * though it's a stateless JWT that would otherwise remain valid until its
 * own expiry (up to 30 days). Call from the logout route. No-ops when
 * Upstash isn't configured (see sessionRevocation.ts) -- logout still
 * clears the cookie either way, it just can't kill a copy of the token
 * that leaked elsewhere until Redis is provisioned.
 */
export async function revokeSessionToken(
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
      : 60 * 60 * 24 * 30;
  await revoke(REVOCATION_PREFIX, payload.jti, ttlSeconds);
}
