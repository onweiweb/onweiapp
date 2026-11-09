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
    select: { id: true, fullName: true, email: true, insiderCode: true },
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
