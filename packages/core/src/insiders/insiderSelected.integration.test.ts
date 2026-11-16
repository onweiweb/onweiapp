import { prisma } from "@onwei/database";
import { afterAll, describe, expect, it } from "vitest";
import {
  getInsiderRecipients,
  markInsiderEmailSent,
  searchInsiderRecipients,
} from "./insiderEmails";

describe.skipIf(!process.env.DATABASE_URL)(
  "send to chosen Insiders (integration)",
  { timeout: 20000 },
  () => {
    const ids: string[] = [];
    const tag = `pick-${crypto.randomUUID().slice(0, 8)}`;

    async function make(data: { code?: string; unsubscribed?: boolean }) {
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: `Pick Test ${tag}`,
          email: `${tag}-${crypto.randomUUID()}@example.test`,
          phone: `+9199${Math.floor(10000000 + Math.random() * 89999999)}`,
          consentVersion: "test",
          insiderCode: data.code ?? null,
          unsubscribedAt: data.unsubscribed ? new Date() : null,
          submittedAt: new Date("2001-01-01T00:00:00Z"),
        },
      });
      ids.push(row.id);
      return row.id;
    }

    afterAll(async () => {
      await prisma.waitlistEntry.deleteMany({ where: { id: { in: ids } } });
    });

    it("finds Insiders and says who can't be picked", async () => {
      const suffix = String(Math.floor(1000 + Math.random() * 8999));
      const ok = await make({ code: `TST${suffix}` });
      const noCode = await make({});
      const out = await make({ code: `TSU${suffix}`, unsubscribed: true });
      const rows = await searchInsiderRecipients(tag);
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(ok)?.blocked).toBeNull();
      expect(byId.get(noCode)?.blocked).toBe("NO_CODE");
      expect(byId.get(out)?.blocked).toBe("UNSUBSCRIBED");
      expect(await searchInsiderRecipients("a")).toEqual([]);

      const { recipients, skipped } = await getInsiderRecipients([
        ok,
        noCode,
        out,
        ok,
      ]);
      expect(recipients.map((r) => r.id)).toEqual([ok]);
      expect(recipients[0]!.alreadyEmailed).toBe(false);
      expect(skipped).toBe(2);

      await markInsiderEmailSent(ok);
      const again = await getInsiderRecipients([ok]);
      expect(again.recipients[0]!.alreadyEmailed).toBe(true);
    });
  },
);
