import { generateOtpCode, hashOtpCode } from "@onwei/auth";
import type { OtpChannel, OtpPurpose } from "@onwei/database";
import { prisma } from "@onwei/database";

// Must match packages/emails' renderOtpEmail, which hardcodes "expires in 10
// minutes" in its copy.
const OTP_EXPIRY_MINUTES = 10;

export interface RequestOtpInput {
  identifier: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  requestIp?: string;
}

export interface RequestOtpResult {
  challengeId: string;
  code: string;
  expiresAt: Date;
}

/**
 * Creates a hashed OTP challenge. Returns the plaintext code ONLY for the
 * caller (an API route) to hand to OtpSender.send() — never put it in an
 * HTTP response or log it anywhere durable.
 */
export async function requestOtpChallenge(
  input: RequestOtpInput,
  secret: string,
): Promise<RequestOtpResult> {
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, secret);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const challenge = await prisma.otpChallenge.create({
    data: {
      identifier: input.identifier,
      channel: input.channel,
      purpose: input.purpose,
      codeHash,
      expiresAt,
      requestIp: input.requestIp,
    },
  });

  return { challengeId: challenge.id, code, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        "NOT_FOUND" | "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "INCORRECT_CODE";
    };

/**
 * Verifies a submitted code against the most recent, not-yet-consumed
 * challenge for an identifier+purpose. Check order matters: the attempts
 * cutoff is checked BEFORE comparing the code, so a correct code submitted
 * after maxAttempts is hit is still rejected, not just future wrong guesses.
 */
export async function verifyOtpChallenge(
  input: { identifier: string; purpose: OtpPurpose; code: string },
  secret: string,
): Promise<VerifyOtpResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      identifier: input.identifier,
      purpose: input.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) return { ok: false, reason: "NOT_FOUND" };
  if (challenge.attempts >= challenge.maxAttempts) {
    return { ok: false, reason: "MAX_ATTEMPTS_EXCEEDED" };
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }

  const submittedHash = hashOtpCode(input.code, secret);
  if (submittedHash !== challenge.codeHash) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INCORRECT_CODE" };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}

export type VerifyAndAuthenticateResult = VerifyOtpResult & {
  customerId?: string;
};

/**
 * Verifies the code, then finds-or-creates a Customer keyed on the
 * identifier (email or phone depending on channel), marking it verified.
 * No Customer.status (SUSPENDED) check — deliberately excluded from this
 * pass's dummy flow, see the plan.
 */
export async function verifyOtpAndAuthenticate(
  input: {
    identifier: string;
    purpose: OtpPurpose;
    code: string;
    channel: OtpChannel;
  },
  secret: string,
): Promise<VerifyAndAuthenticateResult> {
  const result = await verifyOtpChallenge(input, secret);
  if (!result.ok) return result;

  const isEmail = input.channel === "EMAIL";
  const customer = await prisma.customer.upsert({
    where: isEmail ? { email: input.identifier } : { phone: input.identifier },
    update: isEmail
      ? { emailVerifiedAt: new Date() }
      : { phoneVerifiedAt: new Date() },
    create: isEmail
      ? { email: input.identifier, emailVerifiedAt: new Date() }
      : { phone: input.identifier, phoneVerifiedAt: new Date() },
  });

  return { ok: true, customerId: customer.id };
}
