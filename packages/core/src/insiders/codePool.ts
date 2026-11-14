import { randomInt } from "node:crypto";
import { prisma } from "@onwei/database";
import { buildUtmLink } from "../analytics/utmBuilder";
import { writeAuditLog } from "../admin/auditLog";
import { generateInsiderCode } from "./insiderCode";

/**
 * Printed Insider cards. Codes are made ahead of a print run (one row per
 * card in InsiderCode), so cards can be printed before anyone owns them. A
 * new signup takes the lowest free card (see assignInsiderCode).
 * WaitlistEntry.insiderCode stays the code checkout reads.
 */
export const PRINT_RUN_SIZE = 500;
/** Below this many free cards the admin page asks for a reprint. */
export const LOW_FREE_CARDS = 25;
/** WEI + 4 digits gives 9000 codes; keep well clear of running out. */
const MAX_POOL_SIZE = 5000;

export interface PoolFillPlan {
  /** Pool size after the fill. Never below the members who need a card. */
  target: number;
  memberRows: { code: string; cardNumber: number; waitlistEntryId: string }[];
  freeRows: { code: string; cardNumber: number }[];
}

/**
 * Works out which cards to add. Pure, so it is unit tested without a DB.
 * Existing members without a card come first (oldest signup first), then
 * random free codes, numbered after the highest card already made.
 */
export function planPoolFill(input: {
  target: number;
  poolSize: number;
  maxCardNumber: number;
  unpooledMembers: { id: string; code: string }[];
  takenCodes: ReadonlySet<string>;
  random?: (min: number, max: number) => number;
}): PoolFillPlan {
  const target = Math.min(
    Math.max(input.target, input.poolSize + input.unpooledMembers.length),
    MAX_POOL_SIZE,
  );
  let next = input.maxCardNumber + 1;
  const memberRows = input.unpooledMembers.map((member) => ({
    code: member.code,
    cardNumber: next++,
    waitlistEntryId: member.id,
  }));

  const used = new Set(input.takenCodes);
  for (const row of memberRows) used.add(row.code);
  const freeRows: { code: string; cardNumber: number }[] = [];
  const freeNeeded = target - input.poolSize - memberRows.length;
  let attempts = 0;
  while (freeRows.length < freeNeeded) {
    if (++attempts > freeNeeded * 50 + 1000) {
      throw new Error("Could not find enough free Insider codes");
    }
    const code = generateInsiderCode(input.random);
    if (used.has(code)) continue;
    used.add(code);
    freeRows.push({ code, cardNumber: next++ });
  }
  return { target, memberRows, freeRows };
}

export interface PoolFillResult {
  target: number;
  addedForMembers: number;
  addedFree: number;
}

/**
 * Brings the printed-card pool up to `target` cards. Safe to press twice: a
 * full pool adds nothing. Members who already have a code but no card are
 * added first so their card can be printed too.
 */
export async function fillInsiderCodePool(input: {
  staffUserId: string;
  target?: number;
  random?: (min: number, max: number) => number;
}): Promise<PoolFillResult> {
  return prisma.$transaction(
    async (tx) => {
      // One fill at a time; a second press waits, then finds the pool full.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('insider_code_pool_fill'))`;

      const [poolSize, maxRow, unpooled, pooledCodes, memberCodes, coupons] =
        await Promise.all([
          tx.insiderCode.count(),
          tx.insiderCode.aggregate({ _max: { cardNumber: true } }),
          tx.waitlistEntry.findMany({
            where: { insiderCode: { not: null }, printedCard: null },
            select: { id: true, insiderCode: true },
            orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
          }),
          tx.insiderCode.findMany({ select: { code: true } }),
          tx.waitlistEntry.findMany({
            where: { insiderCode: { not: null } },
            select: { insiderCode: true },
          }),
          tx.coupon.findMany({ select: { code: true } }),
        ]);

      const takenCodes = new Set<string>([
        ...pooledCodes.map((r) => r.code),
        ...memberCodes.map((r) => r.insiderCode!),
        ...coupons.map((r) => r.code.toUpperCase()),
      ]);
      const plan = planPoolFill({
        target: input.target ?? PRINT_RUN_SIZE,
        poolSize,
        maxCardNumber: Math.max(maxRow._max.cardNumber ?? 0, 0),
        unpooledMembers: unpooled.map((m) => ({
          id: m.id,
          code: m.insiderCode!,
        })),
        takenCodes,
        random: input.random ?? randomInt,
      });

      const now = new Date();
      if (plan.memberRows.length > 0) {
        await tx.insiderCode.createMany({
          data: plan.memberRows.map((row) => ({ ...row, assignedAt: now })),
        });
      }
      if (plan.freeRows.length > 0) {
        await tx.insiderCode.createMany({ data: plan.freeRows });
      }

      const result: PoolFillResult = {
        target: plan.target,
        addedForMembers: plan.memberRows.length,
        addedFree: plan.freeRows.length,
      };
      if (result.addedForMembers + result.addedFree > 0) {
        await writeAuditLog(
          {
            staffUserId: input.staffUserId,
            action: "insider_cards.fill",
            entityType: "InsiderCode",
            entityId: "pool",
            beforeState: { cards: poolSize },
            afterState: {
              cards: poolSize + result.addedForMembers + result.addedFree,
              ...result,
            },
          },
          tx,
        );
      }
      return result;
    },
    { timeout: 30000 },
  );
}

/**
 * Gives the entry the lowest free printed card, if it has no code yet.
 * Returns the code, or null when there is no free card (or the entry
 * already has a code, which the caller re-reads). The row lock with SKIP
 * LOCKED means two signups at the same moment never get the same card.
 */
export async function takeFreePrintedCode(
  waitlistEntryId: string,
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; code: string }[]>`
      SELECT "id", "code" FROM "InsiderCode"
      WHERE "waitlistEntryId" IS NULL AND "assignedAt" IS NULL
      ORDER BY "cardNumber" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    const card = rows[0];
    if (!card) return null;
    const updated = await tx.waitlistEntry.updateMany({
      where: { id: waitlistEntryId, insiderCode: null },
      data: { insiderCode: card.code },
    });
    if (updated.count !== 1) return null;
    await tx.insiderCode.update({
      where: { id: card.id },
      data: { waitlistEntryId, assignedAt: new Date() },
    });
    return card.code;
  });
}

export async function codeTakenByPool(code: string): Promise<boolean> {
  const row = await prisma.insiderCode.findUnique({
    where: { code },
    select: { id: true },
  });
  return row !== null;
}

export interface PrintedCardOverview {
  printed: number;
  given: number;
  free: number;
  /** Cards whose member was deleted; never handed out again. */
  retired: number;
  /** Members with a code that is on no printed card yet. */
  membersWithoutCard: number;
}

export async function getPrintedCardOverview(): Promise<PrintedCardOverview> {
  const [printed, given, free, membersWithoutCard] = await Promise.all([
    prisma.insiderCode.count(),
    prisma.insiderCode.count({ where: { waitlistEntryId: { not: null } } }),
    prisma.insiderCode.count({
      where: { waitlistEntryId: null, assignedAt: null },
    }),
    prisma.waitlistEntry.count({
      where: { insiderCode: { not: null }, printedCard: null },
    }),
  ]);
  return {
    printed,
    given,
    free,
    retired: printed - given - free,
    membersWithoutCard,
  };
}

/** The link the QR on every card opens, tagged so scans show in Visitors. */
export function insiderCardQrLink(siteUrl: string): string {
  const link = buildUtmLink({
    siteUrl,
    pageUrl: "/",
    channelId: "insider-card",
    campaign: "insider-cards",
  });
  if (!link.ok) throw new Error(`Could not build card link: ${link.reason}`);
  return link.url;
}

export interface PrintRow {
  cardNumber: number;
  code: string;
}

/** Every card from `fromCard` up, for the printer. No personal data. */
export async function listPrintedCodesForPrint(
  fromCard = 1,
): Promise<PrintRow[]> {
  return prisma.insiderCode.findMany({
    where: { cardNumber: { gte: fromCard } },
    select: { cardNumber: true, code: true },
    orderBy: { cardNumber: "asc" },
  });
}
