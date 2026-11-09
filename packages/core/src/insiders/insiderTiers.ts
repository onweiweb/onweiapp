import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

/**
 * Insider discount: one default percentage, plus optional tiers by signup
 * date ("signed up between X and Y gets N%"). The percentage is looked up
 * when a discount is applied, never stored on the code, so an admin change
 * reaches every Insider in that tier straight away.
 *
 * Dates are whole days in India time. A tier for 1 Oct to 15 Oct starts at
 * 1 Oct 00:00 IST and ends (exclusive) at 16 Oct 00:00 IST.
 */

const SINGLETON_ID = "singleton";
export const DEFAULT_INSIDER_PERCENT = 5;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface InsiderTierSummary {
  id: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  percent: number;
}

export interface InsiderTierInput {
  label: string;
  /** First day, "YYYY-MM-DD" in India time. */
  startDate: string;
  /** Last day, "YYYY-MM-DD" in India time, inclusive. */
  endDate: string;
  percent: number;
}

export type InsiderTierResult =
  | { ok: true; tier: InsiderTierSummary }
  | {
      ok: false;
      reason:
        | "INVALID_LABEL"
        | "INVALID_DATE"
        | "END_BEFORE_START"
        | "INVALID_PERCENT"
        | "OVERLAPS"
        | "NOT_FOUND";
      overlapsWith?: string;
    };

/** "2026-10-01" becomes 2026-10-01 00:00 India time, as a UTC Date. */
export function istDayStart(date: string): Date | null {
  if (!DATE_PATTERN.test(date)) return null;
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utcMidnight)) return null;
  const back = new Date(utcMidnight).toISOString().slice(0, 10);
  if (back !== date) return null; // rejects 2026-02-31 and similar
  return new Date(utcMidnight - IST_OFFSET_MS);
}

/** The India-time calendar day a Date falls on, as "YYYY-MM-DD". */
export function istDateOf(value: Date): string {
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The inclusive last day of a tier whose exclusive end is `endsAt`. */
export function istLastDayOf(endsAt: Date): string {
  return istDateOf(new Date(endsAt.getTime() - DAY_MS));
}

export function isValidPercent(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 90;
}

/** The tier a signup time falls in, if any. Pure, for tests and checkout. */
export function findTierFor(
  submittedAt: Date,
  tiers: readonly InsiderTierSummary[],
): InsiderTierSummary | null {
  const time = submittedAt.getTime();
  return (
    tiers.find(
      (tier) => tier.startsAt.getTime() <= time && time < tier.endsAt.getTime(),
    ) ?? null
  );
}

export function resolveInsiderPercent(
  submittedAt: Date,
  tiers: readonly InsiderTierSummary[],
  defaultPercent: number,
): number {
  return findTierFor(submittedAt, tiers)?.percent ?? defaultPercent;
}

function rangesOverlap(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export async function getInsiderDefaultPercent(): Promise<number> {
  const row = await prisma.insiderSetting.findUnique({
    where: { id: SINGLETON_ID },
  });
  return row?.defaultPercent ?? DEFAULT_INSIDER_PERCENT;
}

export async function listInsiderTiers(): Promise<InsiderTierSummary[]> {
  return prisma.insiderTier.findMany({
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      label: true,
      startsAt: true,
      endsAt: true,
      percent: true,
    },
  });
}

/** The percentage this waitlist member gets today. */
export async function getInsiderPercentFor(submittedAt: Date): Promise<number> {
  const [tiers, defaultPercent] = await Promise.all([
    listInsiderTiers(),
    getInsiderDefaultPercent(),
  ]);
  return resolveInsiderPercent(submittedAt, tiers, defaultPercent);
}

export async function updateInsiderDefaultPercent(
  percent: number,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; reason: "INVALID_PERCENT" }> {
  if (!isValidPercent(percent)) return { ok: false, reason: "INVALID_PERCENT" };
  const before = await getInsiderDefaultPercent();
  await prisma.$transaction(async (tx) => {
    await tx.insiderSetting.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        defaultPercent: percent,
        updatedByStaffId: actor.staffUserId,
      },
      update: { defaultPercent: percent, updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.defaultPercent.update",
        entityType: "InsiderSetting",
        entityId: SINGLETON_ID,
        beforeState: { defaultPercent: before },
        afterState: { defaultPercent: percent },
      },
      tx,
    );
  });
  return { ok: true };
}

function parseTierInput(
  input: InsiderTierInput,
):
  | { ok: true; label: string; startsAt: Date; endsAt: Date; percent: number }
  | Extract<InsiderTierResult, { ok: false }> {
  const label = input.label.trim();
  if (label.length < 1 || label.length > 60) {
    return { ok: false, reason: "INVALID_LABEL" };
  }
  const startsAt = istDayStart(input.startDate);
  const lastDay = istDayStart(input.endDate);
  if (!startsAt || !lastDay) return { ok: false, reason: "INVALID_DATE" };
  if (lastDay < startsAt) return { ok: false, reason: "END_BEFORE_START" };
  if (!isValidPercent(input.percent)) {
    return { ok: false, reason: "INVALID_PERCENT" };
  }
  return {
    ok: true,
    label,
    startsAt,
    endsAt: new Date(lastDay.getTime() + DAY_MS),
    percent: input.percent,
  };
}

async function findOverlap(
  range: { startsAt: Date; endsAt: Date },
  ignoreId?: string,
): Promise<InsiderTierSummary | null> {
  const tiers = await listInsiderTiers();
  return (
    tiers.find((tier) => tier.id !== ignoreId && rangesOverlap(tier, range)) ??
    null
  );
}

export async function createInsiderTier(
  input: InsiderTierInput,
  actor: AuditActor,
): Promise<InsiderTierResult> {
  const parsed = parseTierInput(input);
  if (!parsed.ok) return parsed;
  const clash = await findOverlap(parsed);
  if (clash)
    return { ok: false, reason: "OVERLAPS", overlapsWith: clash.label };

  const tier = await prisma.$transaction(async (tx) => {
    const row = await tx.insiderTier.create({
      data: {
        label: parsed.label,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        percent: parsed.percent,
      },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.tier.create",
        entityType: "InsiderTier",
        entityId: row.id,
        afterState: row,
      },
      tx,
    );
    return row;
  });
  return { ok: true, tier };
}

export async function updateInsiderTier(
  id: string,
  input: InsiderTierInput,
  actor: AuditActor,
): Promise<InsiderTierResult> {
  const parsed = parseTierInput(input);
  if (!parsed.ok) return parsed;
  const before = await prisma.insiderTier.findUnique({ where: { id } });
  if (!before) return { ok: false, reason: "NOT_FOUND" };
  const clash = await findOverlap(parsed, id);
  if (clash)
    return { ok: false, reason: "OVERLAPS", overlapsWith: clash.label };

  const tier = await prisma.$transaction(async (tx) => {
    const row = await tx.insiderTier.update({
      where: { id },
      data: {
        label: parsed.label,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        percent: parsed.percent,
      },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.tier.update",
        entityType: "InsiderTier",
        entityId: id,
        beforeState: before,
        afterState: row,
      },
      tx,
    );
    return row;
  });
  return { ok: true, tier };
}

export async function deleteInsiderTier(
  id: string,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" }> {
  const before = await prisma.insiderTier.findUnique({ where: { id } });
  if (!before) return { ok: false, reason: "NOT_FOUND" };
  await prisma.$transaction(async (tx) => {
    await tx.insiderTier.delete({ where: { id } });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.tier.delete",
        entityType: "InsiderTier",
        entityId: id,
        beforeState: before,
      },
      tx,
    );
  });
  return { ok: true };
}
