import { Prisma, prisma, type NewsletterStatus } from "@onwei/database";
import {
  createNewsletterSender,
  renderNewsletterEmail,
  sanitizeNewsletterHtml,
  type EmailSender,
} from "@onwei/emails";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import {
  createInsiderLinkToken,
  verifyInsiderLinkToken,
} from "../insiders/insiderLink";

/**
 * Newsletters written and sent from admin. Who gets one: subscribed people
 * with a recorded opt-in; people added by staff or before consent was
 * recorded only when the issue says so (docs/SECURITY_AND_DPDP.md). Every
 * email has an unsubscribe link and the one-click headers. Sends go in small
 * batches (Resend's free plan allows 100 emails a day); a delivery row per
 * person is claimed first, so nobody gets the same issue twice.
 */

export const NEWSLETTER_BATCH_SIZE = 20;
const SEND_PAUSE_MS = 600;

export interface NewsletterDraftInput {
  subject: string;
  preheader: string;
  bodyHtml: string;
  includeUnconfirmed: boolean;
}

export type SaveNewsletterResult =
  { ok: true; id: string } | { ok: false; message: string };

/** Creates or updates a draft. Sent or sending issues can't change. */
export async function saveNewsletterDraft(
  id: string | null,
  input: NewsletterDraftInput,
  actor: AuditActor,
): Promise<SaveNewsletterResult> {
  const subject = input.subject.trim();
  const bodyHtml = sanitizeNewsletterHtml(input.bodyHtml);
  if (!subject) return { ok: false, message: "Add a subject line." };
  if (!bodyHtml) return { ok: false, message: "Write something to send." };
  const data = {
    subject,
    preheader: input.preheader.trim(),
    bodyHtml,
    includeUnconfirmed: input.includeUnconfirmed,
  };
  if (!id) {
    const created = await prisma.newsletterIssue.create({
      data: { ...data, createdById: actor.staffUserId },
    });
    return { ok: true, id: created.id };
  }
  const updated = await prisma.newsletterIssue.updateMany({
    where: { id, status: "DRAFT" },
    data,
  });
  if (updated.count === 0) {
    return {
      ok: false,
      message: "This newsletter has started sending, so it can't be changed.",
    };
  }
  return { ok: true, id };
}

/** Deletes a draft that was never sent. */
export async function deleteNewsletterDraft(id: string): Promise<boolean> {
  const done = await prisma.newsletterIssue.deleteMany({
    where: { id, status: "DRAFT" },
  });
  return done.count > 0;
}

function audienceWhere(
  includeUnconfirmed: boolean,
): Prisma.NewsletterSubscriberWhereInput {
  return {
    unsubscribedAt: null,
    ...(includeUnconfirmed ? {} : { consentVersion: { not: null } }),
  };
}

export interface NewsletterIssueRow {
  id: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  status: NewsletterStatus;
  includeUnconfirmed: boolean;
  createdAt: Date;
  sentAt: Date | null;
  sent: number;
  failed: number;
}

async function counts(issueIds: string[]) {
  const grouped = await prisma.newsletterDelivery.groupBy({
    by: ["issueId", "status"],
    where: { issueId: { in: issueIds } },
    _count: { _all: true },
  });
  const out = new Map<string, { sent: number; failed: number }>();
  for (const g of grouped) {
    const c = out.get(g.issueId) ?? { sent: 0, failed: 0 };
    if (g.status === "SENT") c.sent += g._count._all;
    if (g.status === "FAILED") c.failed += g._count._all;
    out.set(g.issueId, c);
  }
  return out;
}

export async function listNewsletterIssues(page: {
  skip: number;
  take: number;
}): Promise<NewsletterIssueRow[]> {
  const rows = await prisma.newsletterIssue.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    ...page,
  });
  const byId = await counts(rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    ...(byId.get(r.id) ?? { sent: 0, failed: 0 }),
  }));
}

export async function getNewsletterIssue(
  id: string,
): Promise<NewsletterIssueRow | null> {
  const row = await prisma.newsletterIssue.findUnique({ where: { id } });
  if (!row) return null;
  const byId = await counts([id]);
  return { ...row, ...(byId.get(id) ?? { sent: 0, failed: 0 }) };
}

/** People who would still get this issue (not yet sent to, still subscribed). */
export async function countNewsletterAudience(issue: {
  id: string | null;
  includeUnconfirmed: boolean;
}): Promise<{ remaining: number; withoutOptIn: number }> {
  const [remaining, withoutOptIn] = await Promise.all([
    prisma.newsletterSubscriber.count({
      where: {
        ...audienceWhere(issue.includeUnconfirmed),
        ...(issue.id ? { deliveries: { none: { issueId: issue.id } } } : {}),
      },
    }),
    prisma.newsletterSubscriber.count({
      where: { unsubscribedAt: null, consentVersion: null },
    }),
  ]);
  return { remaining, withoutOptIn };
}

/** The reader's own unsubscribe links. Throws without INSIDER_LINK_SECRET. */
export function newsletterLinks(
  subscriberId: string,
  siteUrl: string,
  secret: string | undefined,
): { unsubscribeUrl: string; oneClickUnsubscribeUrl: string } {
  const base = siteUrl.replace(/\/$/, "");
  const token = encodeURIComponent(
    createInsiderLinkToken("newsletter", subscriberId, secret),
  );
  return {
    unsubscribeUrl: `${base}/newsletter/unsubscribe?t=${token}`,
    oneClickUnsubscribeUrl: `${base}/api/newsletter/unsubscribe?t=${token}`,
  };
}

export interface NewsletterSendContext {
  siteUrl: string;
  secret: string | undefined;
  sender?: EmailSender;
  pauseMs?: number;
}

export type NewsletterBatchResult =
  | { ok: true; sent: number; failed: number; remaining: number }
  | { ok: false; message: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends the next batch (at most `max`, up to 20). The first batch moves the
 * issue to "sending" and writes the audit row; the batch that finds nobody
 * left marks it sent.
 */
export async function sendNewsletterBatch(
  issueId: string,
  max: number,
  actor: AuditActor,
  ctx: NewsletterSendContext,
): Promise<NewsletterBatchResult> {
  const issue = await prisma.newsletterIssue.findUnique({
    where: { id: issueId },
  });
  if (!issue)
    return { ok: false, message: "This newsletter no longer exists." };
  if (issue.status === "SENT") {
    return { ok: true, sent: 0, failed: 0, remaining: 0 };
  }
  // Checked before anything is claimed: links can't be made without it.
  newsletterLinks("check", ctx.siteUrl, ctx.secret);
  if (issue.status === "DRAFT") {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.newsletterIssue.updateMany({
        where: { id: issueId, status: "DRAFT" },
        data: { status: "SENDING" },
      });
      if (moved.count === 0) return;
      const { remaining } = await countNewsletterAudience(issue);
      await writeAuditLog(
        {
          staffUserId: actor.staffUserId,
          action: "newsletter.send",
          entityType: "NewsletterIssue",
          entityId: issueId,
          afterState: {
            subject: issue.subject,
            audience: remaining,
            includeUnconfirmed: issue.includeUnconfirmed,
          },
        },
        tx,
      );
    });
  }

  const take = Math.max(1, Math.min(max, NEWSLETTER_BATCH_SIZE));
  const people = await prisma.newsletterSubscriber.findMany({
    where: {
      ...audienceWhere(issue.includeUnconfirmed),
      deliveries: { none: { issueId } },
    },
    orderBy: [{ subscribedAt: "asc" }, { id: "asc" }],
    select: { id: true, email: true },
    take,
  });
  const sender = ctx.sender ?? createNewsletterSender();
  let sent = 0;
  let failed = 0;
  for (const [i, person] of people.entries()) {
    let deliveryId: string;
    try {
      deliveryId = (
        await prisma.newsletterDelivery.create({
          data: { issueId, subscriberId: person.id },
        })
      ).id;
    } catch (error) {
      // Someone else's batch already claimed this person.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
    if (i > 0) await pause(ctx.pauseMs ?? SEND_PAUSE_MS);
    try {
      await sender.send(
        person.email,
        renderNewsletterEmail({
          subject: issue.subject,
          preheader: issue.preheader,
          bodyHtml: issue.bodyHtml,
          siteUrl: ctx.siteUrl,
          ...newsletterLinks(person.id, ctx.siteUrl, ctx.secret),
        }),
      );
      await prisma.newsletterDelivery.update({
        where: { id: deliveryId },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      await prisma.newsletterDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          error:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "Send failed",
        },
      });
      failed += 1;
    }
  }
  const { remaining } = await countNewsletterAudience(issue);
  if (remaining === 0) {
    await prisma.newsletterIssue.updateMany({
      where: { id: issueId, status: "SENDING" },
      data: { status: "SENT", sentAt: new Date() },
    });
  }
  return { ok: true, sent, failed, remaining };
}

/** "Send me a test": the issue as written, to one address, marked [Test]. */
export async function sendNewsletterTest(
  issueId: string,
  to: string,
  ctx: NewsletterSendContext,
): Promise<boolean> {
  const issue = await prisma.newsletterIssue.findUnique({
    where: { id: issueId },
  });
  if (!issue) return false;
  const email = renderNewsletterEmail({
    subject: `[Test] ${issue.subject}`,
    preheader: issue.preheader,
    bodyHtml: issue.bodyHtml,
    siteUrl: ctx.siteUrl,
    unsubscribeUrl: `${ctx.siteUrl.replace(/\/$/, "")}/newsletter/unsubscribe`,
    oneClickUnsubscribeUrl: `${ctx.siteUrl.replace(/\/$/, "")}/api/newsletter/unsubscribe`,
  });
  try {
    await (ctx.sender ?? createNewsletterSender()).send(to, email);
    return true;
  } catch (error) {
    console.error("[newsletter] test send failed", error);
    return false;
  }
}

/** One-click or page unsubscribe from a newsletter link. */
export async function unsubscribeNewsletter(
  token: string,
  secret: string | undefined,
): Promise<"DONE" | "INVALID"> {
  const result = verifyInsiderLinkToken("newsletter", token, secret);
  if (!result.ok) return "INVALID";
  await prisma.newsletterSubscriber.updateMany({
    where: { id: result.entryId, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  return "DONE";
}
