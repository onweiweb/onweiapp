import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import { subscribeToNewsletter } from "./subscribeToNewsletter";

describe.skipIf(!process.env.DATABASE_URL)(
  "subscribeToNewsletter (integration)",
  { timeout: 20000 },
  () => {
    const createdEmails: string[] = [];

    afterEach(async () => {
      await prisma.newsletterSubscriber.deleteMany({
        where: { email: { in: createdEmails } },
      });
      createdEmails.length = 0;
    });

    function fixtureEmail() {
      const email = `test-newsletter-${randomUUID()}@example.com`;
      createdEmails.push(email);
      return email;
    }

    it("creates a new subscriber row for a new email", async () => {
      const email = fixtureEmail();

      const result = await subscribeToNewsletter(email, "homepage_footer");

      expect(result.alreadySubscribed).toBe(false);
      const row = await prisma.newsletterSubscriber.findUnique({
        where: { email },
      });
      expect(row).not.toBeNull();
      expect(row?.source).toBe("homepage_footer");
      expect(row?.unsubscribedAt).toBeNull();
    });

    it("does not duplicate a row when re-subscribing an already-active email", async () => {
      const email = fixtureEmail();
      await subscribeToNewsletter(email);

      const result = await subscribeToNewsletter(email);

      expect(result.alreadySubscribed).toBe(true);
      const rows = await prisma.newsletterSubscriber.findMany({
        where: { email },
      });
      expect(rows).toHaveLength(1);
    });

    it("clears unsubscribedAt when re-subscribing a previously-unsubscribed email", async () => {
      const email = fixtureEmail();
      await subscribeToNewsletter(email);
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { unsubscribedAt: new Date() },
      });

      const result = await subscribeToNewsletter(email);

      expect(result.alreadySubscribed).toBe(false);
      const row = await prisma.newsletterSubscriber.findUnique({
        where: { email },
      });
      expect(row?.unsubscribedAt).toBeNull();
    });
  },
);
