import { prisma } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";

/**
 * Bookkeeping for the "Email codes to Insiders" button. The admin app does
 * the sending (it owns @onwei/emails), this file makes sure nobody gets the
 * email twice: a member is claimed before sending (compare-and-set), marked
 * sent after, and released if the send failed so a retry reaches them.
 */

// A claim older than this is treated as a crashed send and can be retried.
const STALE_CLAIM_MS = 10 * 60 * 1000;

export interface InsiderOverview {
  members: number;
  withCode: number;
  emailed: number;
  toEmail: number;
  unsubscribed: number;
  addresses: number;
  cardsPosted: number;
}

export async function getInsiderOverview(): Promise<InsiderOverview> {
  const [
    members,
    withCode,
    emailed,
    toEmail,
    unsubscribed,
    addresses,
    cardsPosted,
  ] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { insiderCode: { not: null } } }),
    prisma.waitlistEntry.count({ where: { codeEmailedAt: { not: null } } }),
    prisma.waitlistEntry.count({
      where: {
        insiderCode: { not: null },
        codeEmailedAt: null,
        unsubscribedAt: null,
      },
    }),
    prisma.waitlistEntry.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.insiderCardAddress.count(),
    prisma.insiderCardAddress.count({ where: { postedAt: { not: null } } }),
  ]);
  return {
    members,
    withCode,
    emailed,
    toEmail,
    unsubscribed,
    addresses,
    cardsPosted,
  };
}

export interface InsiderEmailRecipient {
  id: string;
  fullName: string;
  email: string;
  /** E.164, for the Insider WhatsApp sent with the email. */
  phone: string;
  insiderCode: string;
}

/**
 * Claims up to `limit` members who still need the email and returns them.
 * Only members with a code, not unsubscribed, not already sent, and not
 * being sent by someone else right now.
 */
export async function claimInsiderEmailBatch(
  limit: number,
  now: Date = new Date(),
): Promise<InsiderEmailRecipient[]> {
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const candidates = await prisma.waitlistEntry.findMany({
    where: {
      insiderCode: { not: null },
      codeEmailedAt: null,
      unsubscribedAt: null,
      OR: [
        { codeEmailClaimedAt: null },
        { codeEmailClaimedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { submittedAt: "asc" },
    take: limit,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      insiderCode: true,
    },
  });

  const claimed: InsiderEmailRecipient[] = [];
  for (const candidate of candidates) {
    const result = await prisma.waitlistEntry.updateMany({
      where: {
        id: candidate.id,
        codeEmailedAt: null,
        OR: [
          { codeEmailClaimedAt: null },
          { codeEmailClaimedAt: { lt: staleBefore } },
        ],
      },
      data: { codeEmailClaimedAt: now },
    });
    if (result.count === 1 && candidate.insiderCode) {
      claimed.push({ ...candidate, insiderCode: candidate.insiderCode });
    }
  }
  return claimed;
}

export async function markInsiderEmailSent(entryId: string): Promise<void> {
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { codeEmailedAt: new Date(), codeEmailClaimedAt: null },
  });
}

export async function releaseInsiderEmailClaim(entryId: string): Promise<void> {
  await prisma.waitlistEntry.updateMany({
    where: { id: entryId, codeEmailedAt: null },
    data: { codeEmailClaimedAt: null },
  });
}

export async function logInsiderEmailRun(
  result: { sent: number; failed: number },
  actor: AuditActor,
): Promise<void> {
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "insider.email.send",
    entityType: "WaitlistEntry",
    entityId: "bulk",
    afterState: result,
  });
}

export type InsiderEmailStatus =
  "SENT" | "SENDING" | "WAITING" | "UNSUBSCRIBED" | "NO_CODE";

export interface InsiderEmailListRow {
  id: string;
  fullName: string;
  email: string;
  insiderCode: string | null;
  joinedAt: Date;
  emailedAt: Date | null;
  status: InsiderEmailStatus;
}

/**
 * Everyone on the waitlist with where they are with the Insider code email,
 * for the admin "Email" tab. "notSent" lists the not-yet-sent oldest first
 * (the order the send button works through); "sent" lists the latest sends
 * first.
 */
export async function listInsiderEmailStatus(input: {
  page: number;
  pageSize: number;
  show: "notSent" | "sent" | "all";
  now?: Date;
}): Promise<{ rows: InsiderEmailListRow[]; hasNext: boolean; total: number }> {
  const now = input.now ?? new Date();
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const where =
    input.show === "sent"
      ? { codeEmailedAt: { not: null } }
      : input.show === "notSent"
        ? { codeEmailedAt: null }
        : {};
  const skip = (Math.max(input.page, 1) - 1) * input.pageSize;
  const [rows, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      skip,
      take: input.pageSize + 1,
      orderBy:
        input.show === "sent"
          ? [{ codeEmailedAt: "desc" }, { id: "asc" }]
          : [{ submittedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        insiderCode: true,
        submittedAt: true,
        codeEmailedAt: true,
        codeEmailClaimedAt: true,
        unsubscribedAt: true,
      },
    }),
    prisma.waitlistEntry.count({ where }),
  ]);
  return {
    rows: rows.slice(0, input.pageSize).map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      insiderCode: row.insiderCode,
      joinedAt: row.submittedAt,
      emailedAt: row.codeEmailedAt,
      status: row.codeEmailedAt
        ? "SENT"
        : row.unsubscribedAt
          ? "UNSUBSCRIBED"
          : !row.insiderCode
            ? "NO_CODE"
            : row.codeEmailClaimedAt && row.codeEmailClaimedAt >= staleBefore
              ? "SENDING"
              : "WAITING",
    })),
    hasNext: rows.length > input.pageSize,
    total,
  };
}

/** One-click unsubscribe from the Insider email footer. */
export async function unsubscribeWaitlistEntry(
  entryId: string,
): Promise<boolean> {
  const result = await prisma.waitlistEntry.updateMany({
    where: { id: entryId, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  if (result.count === 1) return true;
  const exists = await prisma.waitlistEntry.count({ where: { id: entryId } });
  return exists === 1;
}

/** One Insider in the "Send to chosen Insiders" picker. */
export interface InsiderPickRow {
  id: string;
  fullName: string;
  email: string;
  insiderCode: string | null;
  hasPhone: boolean;
  emailedAt: Date | null;
  /** Why they can't be picked, or null when they can. */
  blocked: "UNSUBSCRIBED" | "NO_CODE" | null;
}

const PICK_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  insiderCode: true,
  codeEmailedAt: true,
  unsubscribedAt: true,
} as const;

function toPickRow(row: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  insiderCode: string | null;
  codeEmailedAt: Date | null;
  unsubscribedAt: Date | null;
}): InsiderPickRow {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    insiderCode: row.insiderCode,
    hasPhone: Boolean(row.phone),
    emailedAt: row.codeEmailedAt,
    blocked: row.unsubscribedAt
      ? "UNSUBSCRIBED"
      : !row.insiderCode
        ? "NO_CODE"
        : null,
  };
}

/** Up to 10 Insiders matching a name, email or code, newest first. */
export async function searchInsiderRecipients(
  query: string,
): Promise<InsiderPickRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.waitlistEntry.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { insiderCode: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
    select: PICK_SELECT,
  });
  return rows.map(toPickRow);
}

/**
 * Reloads chosen Insiders on the server before a send, so a stale page can't
 * email the wrong people. Returns who can be sent to, and who was skipped.
 */
export async function getInsiderRecipients(ids: string[]): Promise<{
  recipients: (InsiderEmailRecipient & { alreadyEmailed: boolean })[];
  skipped: number;
}> {
  const unique = [...new Set(ids)];
  const rows = await prisma.waitlistEntry.findMany({
    where: { id: { in: unique } },
    select: PICK_SELECT,
  });
  const recipients = rows
    .filter((row) => row.insiderCode && !row.unsubscribedAt)
    .map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      insiderCode: row.insiderCode!,
      alreadyEmailed: row.codeEmailedAt !== null,
    }));
  return { recipients, skipped: unique.length - recipients.length };
}

export async function logInsiderSelectedSend(
  result: { sent: number; failed: number; ids: string[] },
  actor: AuditActor,
): Promise<void> {
  await writeAuditLog({
    staffUserId: actor.staffUserId,
    action: "insider.email.send_selected",
    entityType: "WaitlistEntry",
    entityId: "selected",
    afterState: result,
  });
}
