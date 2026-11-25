import { Prisma, prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import type { Attribution, GeoLocation } from "../analytics/attribution";
import { getSiteSetting } from "../settings/siteSetting";
import { isValidEmail } from "../validation/email";
import { validatePhone } from "../validation/phone";
import {
  assignInsiderCode,
  isInsiderCodeFormat,
  normalizeCode,
} from "./insiderCode";
import { grantInviteRewards, type GrantedReward } from "./inviteRewards";

/**
 * Invite-only Insiders (owner brief 2026-11-25, docs/COMMERCE_BUILD_PLAN.md
 * section 20). With the join mode set to INVITE_OR_APPLY there are two ways
 * in:
 * - Path A: an Insider's number lets you in. Short form, mobile checked by
 *   a code, approved at once with a code of your own; the inviter is saved
 *   and may earn an invite reward.
 * - Path B: apply. The application waits in admin Insiders > Applications
 *   until staff approve (code and welcome sent) or reject it.
 * One mobile number can apply once. Existing members keep everything.
 */

export const JOIN_REASONS = [
  "First access to drops",
  "Exclusive offers and discounts",
  "Events access",
  "Giving insights on product",
  "Meeting other people who move",
  "All of the above!",
] as const;

export const SESSION_PICKS = [
  "6am",
  "Lunchtime",
  "After work",
  "Whenever it happens",
] as const;

export type InsiderJoinMode = "OPEN" | "INVITE_OR_APPLY";

export async function getInsiderJoinMode(): Promise<InsiderJoinMode> {
  const row = await prisma.insiderSetting.findUnique({
    where: { id: "singleton" },
    select: { joinMode: true },
  });
  return row?.joinMode ?? "OPEN";
}

export async function setInsiderJoinMode(
  mode: InsiderJoinMode,
  actor: AuditActor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const before = await tx.insiderSetting.findUnique({
      where: { id: "singleton" },
      select: { joinMode: true },
    });
    await tx.insiderSetting.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        joinMode: mode,
        updatedByStaffId: actor.staffUserId,
      },
      update: { joinMode: mode, updatedByStaffId: actor.staffUserId },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: "insider.joinMode.update",
        entityType: "InsiderSetting",
        entityId: "singleton",
        beforeState: { joinMode: before?.joinMode ?? "OPEN" },
        afterState: { joinMode: mode },
      },
      tx,
    );
  });
}

/** Whether an Insider number can let someone in, and whose it is. */
export async function findInviter(
  rawCode: string,
): Promise<{ id: string; firstName: string } | null> {
  if (!isInsiderCodeFormat(rawCode)) return null;
  const entry = await prisma.waitlistEntry.findFirst({
    where: { insiderCode: normalizeCode(rawCode), status: "APPROVED" },
    select: { id: true, fullName: true },
  });
  if (!entry) return null;
  return {
    id: entry.id,
    firstName: entry.fullName.trim().split(/\s+/)[0] ?? "",
  };
}

export interface JoinInput {
  fullName: string;
  email: string;
  /** Already checked with a code by the caller. */
  phone: string;
  activity: string;
  joinReasons?: string[];
  sessionPick?: string | null;
  gearWish?: string | null;
  consentVersion: string;
  ipAddress?: string;
  attribution?: Partial<Attribution>;
  geo?: Partial<GeoLocation>;
  source?: string;
}

export type JoinProblem =
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PHONE"
  | "INVALID_ACTIVITY"
  | "INVALID_REASONS"
  | "INVALID_SESSION"
  | "INVALID_GEAR_WISH"
  | "ALREADY_MEMBER"
  | "ALREADY_APPLIED"
  | "DUPLICATE_EMAIL"
  | "UNKNOWN_INVITER";

type Clean = {
  fullName: string;
  email: string;
  phone: string;
  activity: string;
  joinReasons: string[];
  sessionPick: string | null;
  gearWish: string | null;
};

async function clean(
  input: JoinInput,
  kind: "INVITE" | "APPLY",
): Promise<{ ok: true; value: Clean } | { ok: false; reason: JoinProblem }> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 80)
    return { ok: false, reason: "INVALID_NAME" };
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, reason: "INVALID_EMAIL" };
  const { allowInternationalPhone } = await getSiteSetting();
  const phone = validatePhone(input.phone, {
    allowInternational: allowInternationalPhone,
  });
  if (!phone.valid || !phone.e164)
    return { ok: false, reason: "INVALID_PHONE" };
  const activity = input.activity.trim();
  if (activity.length < 2 || activity.length > 120)
    return { ok: false, reason: "INVALID_ACTIVITY" };
  const reasons = [...new Set(input.joinReasons ?? [])];
  if (
    reasons.some((r) => !(JOIN_REASONS as readonly string[]).includes(r)) ||
    (kind === "APPLY" && reasons.length === 0)
  )
    return { ok: false, reason: "INVALID_REASONS" };
  const sessionPick = input.sessionPick?.trim() || null;
  if (
    sessionPick &&
    !(SESSION_PICKS as readonly string[]).includes(sessionPick)
  )
    return { ok: false, reason: "INVALID_SESSION" };
  const gearWish = input.gearWish?.trim() || null;
  if (gearWish && gearWish.length > 300)
    return { ok: false, reason: "INVALID_GEAR_WISH" };

  const [byPhone, byEmail] = await Promise.all([
    prisma.waitlistEntry.findUnique({
      where: { phone: phone.e164 },
      select: { status: true },
    }),
    prisma.waitlistEntry.findUnique({ where: { email }, select: { id: true } }),
  ]);
  if (byPhone)
    return {
      ok: false,
      reason:
        byPhone.status === "APPROVED" ? "ALREADY_MEMBER" : "ALREADY_APPLIED",
    };
  if (byEmail) return { ok: false, reason: "DUPLICATE_EMAIL" };
  return {
    ok: true,
    value: {
      fullName,
      email,
      phone: phone.e164,
      activity,
      joinReasons: reasons,
      sessionPick,
      gearWish,
    },
  };
}

function rowData(input: JoinInput, value: Clean) {
  return {
    ...value,
    source: input.source ?? "insiders_page",
    consentVersion: input.consentVersion,
    ipAddress: input.ipAddress ?? null,
    country: input.geo?.country ?? null,
    region: input.geo?.region ?? null,
    city: input.geo?.city ?? null,
    referrerHost: input.attribution?.referrerHost ?? null,
    utmSource: input.attribution?.utmSource ?? null,
    utmMedium: input.attribution?.utmMedium ?? null,
    utmCampaign: input.attribution?.utmCampaign ?? null,
    utmContent: input.attribution?.utmContent ?? null,
  };
}

function isUnique(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export type JoinByInviteResult =
  | {
      ok: true;
      entryId: string;
      fullName: string;
      insiderCode: string | null;
      inviterId: string;
      rewards: GrantedReward[];
    }
  | { ok: false; reason: JoinProblem };

/** Path A: let in by an Insider's number, approved straight away. */
export async function joinByInvite(
  input: JoinInput & { inviterCode: string },
): Promise<JoinByInviteResult> {
  const inviter = await findInviter(input.inviterCode);
  if (!inviter) return { ok: false, reason: "UNKNOWN_INVITER" };
  const checked = await clean(input, "INVITE");
  if (!checked.ok) return checked;
  let entryId: string;
  try {
    const created = await prisma.waitlistEntry.create({
      data: {
        ...rowData(input, checked.value),
        status: "APPROVED",
        invitedByEntryId: inviter.id,
        reviewedAt: new Date(),
      },
      select: { id: true },
    });
    entryId = created.id;
  } catch (error) {
    if (isUnique(error)) return { ok: false, reason: "ALREADY_APPLIED" };
    throw error;
  }
  let insiderCode: string | null = null;
  try {
    insiderCode = await assignInsiderCode(entryId);
  } catch (error) {
    console.error("[insiders] code for invited member failed", error);
  }
  const rewards = await grantInviteRewards(inviter.id).catch((error) => {
    console.error("[insiders] invite rewards failed", error);
    return [] as GrantedReward[];
  });
  return {
    ok: true,
    entryId,
    fullName: checked.value.fullName,
    insiderCode,
    inviterId: inviter.id,
    rewards,
  };
}

export type ApplyResult =
  | { ok: true; entryId: string; fullName: string; email: string }
  | { ok: false; reason: JoinProblem };

/** Path B: an application staff approve or reject. */
export async function applyToJoin(input: JoinInput): Promise<ApplyResult> {
  const checked = await clean(input, "APPLY");
  if (!checked.ok) return checked;
  try {
    const created = await prisma.waitlistEntry.create({
      data: { ...rowData(input, checked.value), status: "APPLIED" },
      select: { id: true },
    });
    return {
      ok: true,
      entryId: created.id,
      fullName: checked.value.fullName,
      email: checked.value.email,
    };
  } catch (error) {
    if (isUnique(error)) return { ok: false, reason: "ALREADY_APPLIED" };
    throw error;
  }
}

export interface ApplicationFilters {
  status?: "APPLIED" | "APPROVED" | "REJECTED";
  /** Words in the fitness activity. */
  activity?: string;
  reason?: string;
  /** "YYYY-MM-DD", India time, inclusive. */
  from?: string;
  to?: string;
  /** Name, email or phone. */
  search?: string;
}

export function applicationWhere(
  filters: ApplicationFilters,
): Prisma.WaitlistEntryWhereInput {
  const from = filters.from ? new Date(`${filters.from}T00:00:00+05:30`) : null;
  const to = filters.to ? new Date(`${filters.to}T00:00:00+05:30`) : null;
  const search = filters.search?.trim();
  return {
    // Applications are rows that went through Path B (they have reasons) or
    // are still waiting; members let in by invite show under Members.
    status: filters.status ?? "APPLIED",
    joinReasons: { isEmpty: false },
    ...(filters.activity
      ? { activity: { contains: filters.activity, mode: "insensitive" } }
      : {}),
    ...(filters.reason ? { joinReasons: { has: filters.reason } } : {}),
    ...(from || to
      ? {
          submittedAt: {
            ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !Number.isNaN(to.getTime())
              ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) }
              : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };
}

export interface ApplicationRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  activity: string | null;
  joinReasons: string[];
  sessionPick: string | null;
  gearWish: string | null;
  submittedAt: Date;
  status: "APPLIED" | "APPROVED" | "REJECTED";
  reviewedAt: Date | null;
}

const APPLICATION_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  activity: true,
  joinReasons: true,
  sessionPick: true,
  gearWish: true,
  submittedAt: true,
  status: true,
  reviewedAt: true,
} satisfies Prisma.WaitlistEntrySelect;

export async function listApplications(
  filters: ApplicationFilters,
  page: { skip: number; take: number },
): Promise<{ rows: ApplicationRow[]; total: number; waiting: number }> {
  const where = applicationWhere(filters);
  const [rows, total, waiting] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      skip: page.skip,
      take: page.take,
      select: APPLICATION_SELECT,
    }),
    prisma.waitlistEntry.count({ where }),
    prisma.waitlistEntry.count({ where: { status: "APPLIED" } }),
  ]);
  return { rows, total, waiting };
}

function csvCell(value: string): string {
  // Leading = + - @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function exportApplicationsCsv(
  filters: ApplicationFilters,
): Promise<string> {
  const rows = await prisma.waitlistEntry.findMany({
    where: applicationWhere(filters),
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: APPLICATION_SELECT,
    take: 10000,
  });
  const header = [
    "Applied on",
    "Status",
    "Name",
    "Email",
    "Mobile",
    "Fitness activity",
    "Why join",
    "Session",
    "Gear they wish existed",
  ];
  const lines = rows.map((r) =>
    [
      r.submittedAt.toISOString(),
      r.status,
      r.fullName,
      r.email,
      r.phone,
      r.activity ?? "",
      r.joinReasons.join("; "),
      r.sessionPick ?? "",
      r.gearWish ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export interface ReviewResult {
  /** Approved now: send each the welcome. */
  approved: { entryId: string; inviterId: string | null }[];
  rejected: number;
  /** Already approved or rejected by someone else. */
  skipped: number;
  rewards: GrantedReward[];
}

/** Approve: gives each a code (next printed card) and grants invite rewards. */
export async function approveApplications(
  ids: string[],
  actor: AuditActor,
): Promise<ReviewResult> {
  const result: ReviewResult = {
    approved: [],
    rejected: 0,
    skipped: 0,
    rewards: [],
  };
  for (const id of [...new Set(ids)]) {
    const done = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.waitlistEntry.updateMany({
          where: { id, status: "APPLIED" },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedByStaffId: actor.staffUserId,
          },
        });
        if (claimed.count === 0) return null;
        await writeAuditLog(
          {
            staffUserId: actor.staffUserId,
            action: "insider.application.approve",
            entityType: "WaitlistEntry",
            entityId: id,
            beforeState: { status: "APPLIED" },
            afterState: { status: "APPROVED" },
          },
          tx,
        );
        return tx.waitlistEntry.findUniqueOrThrow({
          where: { id },
          select: { invitedByEntryId: true },
        });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
    if (!done) {
      result.skipped++;
      continue;
    }
    try {
      await assignInsiderCode(id);
    } catch (error) {
      console.error("[insiders] code on approval failed", id, error);
    }
    result.approved.push({ entryId: id, inviterId: done.invitedByEntryId });
    if (done.invitedByEntryId)
      result.rewards.push(
        ...(await grantInviteRewards(done.invitedByEntryId).catch(() => [])),
      );
  }
  return result;
}

export async function rejectApplications(
  ids: string[],
  actor: AuditActor,
): Promise<ReviewResult> {
  const result: ReviewResult = {
    approved: [],
    rejected: 0,
    skipped: 0,
    rewards: [],
  };
  for (const id of [...new Set(ids)]) {
    const ok = await prisma.$transaction(async (tx) => {
      const claimed = await tx.waitlistEntry.updateMany({
        where: { id, status: "APPLIED" },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedByStaffId: actor.staffUserId,
        },
      });
      if (claimed.count === 0) return false;
      await writeAuditLog(
        {
          staffUserId: actor.staffUserId,
          action: "insider.application.reject",
          entityType: "WaitlistEntry",
          entityId: id,
          beforeState: { status: "APPLIED" },
          afterState: { status: "REJECTED" },
        },
        tx,
      );
      return true;
    });
    if (ok) result.rejected++;
    else result.skipped++;
  }
  return result;
}
