import { prisma } from "@onwei/database";
import type { EmailSender } from "@onwei/emails";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  countNewsletterAudience,
  newsletterLinks,
  saveNewsletterDraft,
  sendNewsletterBatch,
  unsubscribeNewsletter,
} from "./issues";

// Test subscribers only (example.test), removed afterwards. Emails are
// recorded by a fake sender, nothing is sent.
const SECRET = "test-newsletter-link-secret-0123456789abcdef";
const TAG = `nl-${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)(
  "newsletter sending (integration)",
  () => {
    let actor: { staffUserId: string };
    const ids: string[] = [];
    const issueIds: string[] = [];
    const sent: {
      to: string;
      subject: string;
      headers?: Record<string, string>;
    }[] = [];
    const sender: EmailSender = {
      async send(to, email) {
        sent.push({ to, subject: email.subject, headers: email.headers });
      },
    };
    const ctx = {
      siteUrl: "https://www.onwei.in",
      secret: SECRET,
      sender,
      pauseMs: 0,
    };

    async function subscriber(
      name: string,
      opts: { consent?: boolean; unsubscribed?: boolean } = {},
    ) {
      const row = await prisma.newsletterSubscriber.create({
        data: {
          email: `${TAG}-${name}@example.test`,
          source: "test",
          consentVersion: opts.consent === false ? null : "test",
          consentedAt: opts.consent === false ? null : new Date(),
          unsubscribedAt: opts.unsubscribed ? new Date() : null,
        },
      });
      ids.push(row.id);
      return row;
    }

    beforeAll(async () => {
      actor = {
        staffUserId: (
          await prisma.staffUser.findFirstOrThrow({
            orderBy: { createdAt: "asc" },
          })
        ).id,
      };
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: issueIds } },
      });
      await prisma.newsletterIssue.deleteMany({
        where: { id: { in: issueIds } },
      });
      await prisma.newsletterSubscriber.deleteMany({
        where: { id: { in: ids } },
      });
    });

    it("sends once to each opted-in subscriber, even when batches overlap", async () => {
      const a = await subscriber("a");
      const b = await subscriber("b");
      const noOptIn = await subscriber("old", { consent: false });
      await subscriber("gone", { unsubscribed: true });

      const saved = await saveNewsletterDraft(
        null,
        {
          subject: `${TAG} Drop 2`,
          preheader: "New colours",
          bodyHtml: "<p>Hi</p><script>alert(1)</script>",
          includeUnconfirmed: false,
        },
        actor,
      );
      if (!saved.ok) throw new Error(saved.message);
      issueIds.push(saved.id);
      const issue = await prisma.newsletterIssue.findUniqueOrThrow({
        where: { id: saved.id },
      });
      expect(issue.bodyHtml).toBe("<p>Hi</p>");

      // Only our test rows matter: count what the sends deliver to them.
      await Promise.all([
        sendNewsletterBatch(saved.id, 20, actor, ctx),
        sendNewsletterBatch(saved.id, 20, actor, ctx),
      ]);
      let rounds = 0;
      while (
        (
          await countNewsletterAudience({
            id: saved.id,
            includeUnconfirmed: false,
          })
        ).remaining > 0 &&
        rounds < 50
      ) {
        await sendNewsletterBatch(saved.id, 20, actor, ctx);
        rounds += 1;
      }
      const mine = sent.filter((s) => s.to.startsWith(TAG));
      expect(mine.map((s) => s.to).sort()).toEqual([a.email, b.email].sort());
      expect(mine[0]?.headers?.["List-Unsubscribe-Post"]).toBe(
        "List-Unsubscribe=One-Click",
      );
      expect(
        await prisma.newsletterDelivery.count({
          where: { issueId: saved.id, subscriberId: noOptIn.id },
        }),
      ).toBe(0);
      expect(
        (
          await prisma.newsletterIssue.findUniqueOrThrow({
            where: { id: saved.id },
          })
        ).status,
      ).toBe("SENT");
      // A sent newsletter can't be edited.
      expect(
        await saveNewsletterDraft(
          saved.id,
          {
            subject: "x",
            preheader: "",
            bodyHtml: "<p>x</p>",
            includeUnconfirmed: false,
          },
          actor,
        ),
      ).toMatchObject({ ok: false });
    });

    it("unsubscribes from the link in the email, and refuses a forged one", async () => {
      const c = await subscriber("c");
      const { oneClickUnsubscribeUrl } = newsletterLinks(
        c.id,
        ctx.siteUrl,
        SECRET,
      );
      const token = decodeURIComponent(
        new URL(oneClickUnsubscribeUrl).searchParams.get("t")!,
      );
      expect(await unsubscribeNewsletter(token, SECRET)).toBe("DONE");
      expect(
        (
          await prisma.newsletterSubscriber.findUniqueOrThrow({
            where: { id: c.id },
          })
        ).unsubscribedAt,
      ).not.toBeNull();
      expect(
        await unsubscribeNewsletter(`${c.id}.9999999999.forged`, SECRET),
      ).toBe("INVALID");
    });
  },
);
