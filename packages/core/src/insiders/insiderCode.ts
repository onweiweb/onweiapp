import { randomInt } from "node:crypto";
import { Prisma, prisma } from "@onwei/database";
import { codeTakenByPool, takeFreePrintedCode } from "./codePool";

/**
 * Onwei Insider codes: "WEI" + 4 digits, as printed in the client's Insider
 * emailer (for example WEI7820). Random, never sequential, unique across
 * Insider codes and coupon codes. Guessing one is useless because a code only
 * works for the signed-in person it belongs to (docs/COMMERCE_BUILD_PLAN.md).
 */
export const INSIDER_CODE_PREFIX = "WEI";
const INSIDER_CODE_PATTERN = /^WEI\d{4}$/;
const MAX_ATTEMPTS = 25;

export function generateInsiderCode(
  random: (min: number, max: number) => number = randomInt,
): string {
  return `${INSIDER_CODE_PREFIX}${random(1000, 10000)}`;
}

/** Trims, drops inner spaces and uppercases, so " wei 7820" matches. */
export function normalizeCode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isInsiderCodeFormat(input: string): boolean {
  return INSIDER_CODE_PATTERN.test(normalizeCode(input));
}

async function codeTakenByCoupon(code: string): Promise<boolean> {
  const coupon = await prisma.coupon.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    select: { id: true },
  });
  return coupon !== null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Gives one waitlist entry a code if it has none. Safe to call twice: an
 * entry that already has a code keeps it. Returns the entry's code. Takes
 * the next free printed card first (codePool.ts); only when every printed
 * card is taken does it make a random code with no card.
 */
export async function assignInsiderCode(
  waitlistEntryId: string,
  random?: (min: number, max: number) => number,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existing = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: waitlistEntryId },
      select: { insiderCode: true },
    });
    if (existing.insiderCode) return existing.insiderCode;

    if (attempt === 0) {
      const printed = await takeFreePrintedCode(waitlistEntryId);
      if (printed) return printed;
      // No free card, or another caller set a code first: loop re-reads.
      continue;
    }

    const code = generateInsiderCode(random);
    if (await codeTakenByCoupon(code)) continue;
    // Free printed codes are reserved for their cards.
    if (await codeTakenByPool(code)) continue;

    try {
      // Compare-and-set on "still has no code", so two callers racing on the
      // same entry can't overwrite each other's code.
      const result = await prisma.waitlistEntry.updateMany({
        where: { id: waitlistEntryId, insiderCode: null },
        data: { insiderCode: code },
      });
      if (result.count === 1) return code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Another entry already has this code, try a new one.
    }
  }
  throw new Error("Could not find a free Insider code");
}

/** Gives every waitlist entry without a code one. Returns how many got one. */
export async function assignMissingInsiderCodes(): Promise<number> {
  const missing = await prisma.waitlistEntry.findMany({
    // Applications get their code when staff approve them.
    where: { insiderCode: null, status: "APPROVED" },
    select: { id: true },
    orderBy: { submittedAt: "asc" },
  });
  for (const entry of missing) {
    await assignInsiderCode(entry.id);
  }
  return missing.length;
}
