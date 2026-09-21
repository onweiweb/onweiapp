import { TextEncoder } from "node:util";
import { jwtVerify, SignJWT } from "jose";

/**
 * TEMPORARY PLACEHOLDER: root CLAUDE.md's tech stack table calls out
 * Redis-backed sessions (Upstash) as the eventual approach for "OTP
 * throttling, sessions, caching." This stateless, jose-signed httpOnly JWT
 * cookie is an explicitly-approved stand-in for the dummy OTP flow, isolated
 * behind these two functions so swapping to Redis later touches one file,
 * not every call site.
 */
export const SESSION_COOKIE_NAME = "onwei_session";

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
    return { customerId: payload.customerId };
  } catch {
    return null;
  }
}
