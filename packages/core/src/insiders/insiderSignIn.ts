import { prisma } from "@onwei/database";
import { isInsiderCodeFormat, normalizeCode } from "./insiderCode";

/**
 * Signing in with an Insider ID (WEI + 4 digits) instead of a mobile number:
 * the code goes to the mobile number on that membership. The number is never
 * sent to the browser, only its last digits ("••••••4321"), so typing someone
 * else's ID can't reveal their number, and only the owner can finish the
 * sign-in. Entering an ID never applies the Insider offer by itself: it
 * applies once the customer is signed in with the member's number.
 */

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `••••••${digits.slice(-4)}`;
}

/** The member's mobile for this Insider ID, or null for an unknown ID. */
export async function findInsiderPhone(
  rawCode: string,
): Promise<{ code: string; phone: string; masked: string } | null> {
  if (!isInsiderCodeFormat(rawCode)) return null;
  const code = normalizeCode(rawCode);
  const entry = await prisma.waitlistEntry.findFirst({
    where: { insiderCode: code, status: "APPROVED" },
    select: { phone: true },
  });
  if (!entry?.phone) return null;
  return { code, phone: entry.phone, masked: maskPhone(entry.phone) };
}
