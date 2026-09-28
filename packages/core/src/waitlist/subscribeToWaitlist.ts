import { prisma } from "@onwei/database";
import { isValidEmail } from "../validation/email";
import { validatePhone } from "../validation/phone";
import { getSiteSetting } from "../settings/siteSetting";
import type {
  SubscribeToWaitlistInput,
  SubscribeToWaitlistResult,
} from "./types";

function clampMovementFlex(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value)));
}

export async function subscribeToWaitlist(
  input: SubscribeToWaitlistInput,
): Promise<SubscribeToWaitlistResult> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) return { ok: false, reason: "INVALID_NAME" };

  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, reason: "INVALID_EMAIL" };

  const { allowInternationalPhone } = await getSiteSetting();
  const phoneResult = validatePhone(input.phone, {
    allowInternational: allowInternationalPhone,
  });
  if (!phoneResult.valid || !phoneResult.e164) {
    return { ok: false, reason: "INVALID_PHONE" };
  }
  const phone = phoneResult.e164;

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.waitlistEntry.findUnique({ where: { email } }),
    prisma.waitlistEntry.findUnique({ where: { phone } }),
  ]);

  // Same person resubmitting the identical pair reads as "already joined,"
  // not an error — only a genuine collision (one field matches a different
  // person's row) is rejected.
  if (existingEmail && existingEmail.id === existingPhone?.id) {
    return { ok: true, alreadyJoined: true };
  }
  if (existingEmail) return { ok: false, reason: "DUPLICATE_EMAIL" };
  if (existingPhone) return { ok: false, reason: "DUPLICATE_PHONE" };

  await prisma.waitlistEntry.create({
    data: {
      fullName,
      email,
      phone,
      movementFlex: clampMovementFlex(input.movementFlex),
      source: input.source ?? null,
      consentVersion: input.consentVersion,
      ipAddress: input.ipAddress ?? null,
    },
  });

  return { ok: true, alreadyJoined: false };
}
