import { randomInt, createHmac } from "node:crypto";

/** A cryptographically-random 6-digit OTP code, as a zero-padded string. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * One-way hash of an OTP code for storage in OtpChallenge.codeHash
 * (packages/database/prisma/schema.prisma) — the plaintext code is never
 * persisted, only sent once via OtpSender and compared by re-hashing.
 *
 * A 6-digit code only has 1,000,000 possibilities, so a plain hash (sha256,
 * etc.) would let a leaked codeHash be brute-forced offline in milliseconds.
 * HMAC-ing with a server-only secret (never stored in the database) makes
 * that infeasible without the secret. `secret` should come from an env var
 * such as OTP_HASH_SECRET — never hardcode it, never commit it.
 */
export function hashOtpCode(code: string, secret: string): string {
  if (!secret) {
    throw new Error(
      "hashOtpCode requires a non-empty secret (e.g. OTP_HASH_SECRET)",
    );
  }
  return createHmac("sha256", secret).update(code).digest("hex");
}
