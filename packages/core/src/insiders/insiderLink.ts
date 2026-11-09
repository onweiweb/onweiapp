import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Private links in the Insider email ("Share your address" and
 * "Unsubscribe"), so a member can act without signing in. The token is the
 * waitlist entry id, an expiry and an HMAC over both plus the link's purpose,
 * so an unsubscribe token can't open the address form and nobody can forge
 * a link for another member. Secret: INSIDER_LINK_SECRET (web and admin).
 */
export type InsiderLinkPurpose = "address" | "unsubscribe";

const ADDRESS_LINK_DAYS = 90;
// Unsubscribe links must keep working for as long as the email exists.
const UNSUBSCRIBE_LINK_DAYS = 365 * 5;
const MIN_SECRET_LENGTH = 32;

function sign(
  purpose: InsiderLinkPurpose,
  entryId: string,
  expires: number,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${purpose}:${entryId}:${expires}`)
    .digest("base64url");
}

function assertSecret(secret: string | undefined): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `INSIDER_LINK_SECRET must be set (at least ${MIN_SECRET_LENGTH} characters)`,
    );
  }
  return secret;
}

export function createInsiderLinkToken(
  purpose: InsiderLinkPurpose,
  entryId: string,
  secret: string | undefined,
  now: Date = new Date(),
): string {
  const days =
    purpose === "address" ? ADDRESS_LINK_DAYS : UNSUBSCRIBE_LINK_DAYS;
  const expires = Math.floor(now.getTime() / 1000) + days * 24 * 60 * 60;
  const signature = sign(purpose, entryId, expires, assertSecret(secret));
  return `${entryId}.${expires}.${signature}`;
}

export type VerifyInsiderLinkResult =
  { ok: true; entryId: string } | { ok: false; reason: "INVALID" | "EXPIRED" };

export function verifyInsiderLinkToken(
  purpose: InsiderLinkPurpose,
  token: string,
  secret: string | undefined,
  now: Date = new Date(),
): VerifyInsiderLinkResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "INVALID" };
  const [entryId, expiresRaw, signature] = parts as [string, string, string];
  const expires = Number(expiresRaw);
  if (!entryId || !Number.isInteger(expires)) {
    return { ok: false, reason: "INVALID" };
  }

  const expected = Buffer.from(
    sign(purpose, entryId, expires, assertSecret(secret)),
  );
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "INVALID" };
  }
  if (expires * 1000 < now.getTime()) return { ok: false, reason: "EXPIRED" };
  return { ok: true, entryId };
}
