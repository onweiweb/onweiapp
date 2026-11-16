import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listWhatsAppMessages } from "./messageLog";

describe.skipIf(!process.env.DATABASE_URL)(
  "WhatsApp message log (integration)",
  { timeout: 20000 },
  () => {
    const ending = String(Math.floor(1000000 + Math.random() * 8999999));
    const phone = `+91990${ending}`;
    const ids: string[] = [];

    beforeAll(async () => {
      const older = await prisma.whatsAppMessage.create({
        data: {
          purpose: "WAITLIST_JOINED",
          phone,
          status: "DELIVERED",
          createdAt: new Date(Date.now() - 60_000),
        },
      });
      const newer = await prisma.whatsAppMessage.create({
        data: {
          purpose: "SIGN_IN_CODE",
          phone,
          status: "FAILED",
          failureReason: "Message Sending failed as template did not match",
        },
      });
      ids.push(older.id, newer.id);
    });

    afterAll(async () => {
      await prisma.whatsAppMessage.deleteMany({ where: { id: { in: ids } } });
    });

    it("lists newest first with the number masked", async () => {
      const { rows } = await listWhatsAppMessages({
        page: 1,
        pageSize: 50,
        phoneEnding: ending,
      });
      expect(rows.map((r) => r.id)).toEqual([ids[1], ids[0]]);
      expect(rows[0]!.phone).toMatch(/•••• \d{4}$/);
      expect(rows[0]!.phone).not.toContain(ending);
      expect(rows[0]!.name).toBeNull();
    });

    it("filters by status and message", async () => {
      const failed = await listWhatsAppMessages({
        page: 1,
        pageSize: 50,
        phoneEnding: ending,
        status: "FAILED",
      });
      expect(failed.rows.map((r) => r.id)).toEqual([ids[1]]);
      expect(failed.rows[0]!.failureReason).toMatch(/did not match/);
      const welcome = await listWhatsAppMessages({
        page: 1,
        pageSize: 50,
        phoneEnding: ending,
        purpose: "WAITLIST_JOINED",
      });
      expect(welcome.rows.map((r) => r.id)).toEqual([ids[0]]);
    });

    it("pages", async () => {
      const first = await listWhatsAppMessages({
        page: 1,
        pageSize: 1,
        phoneEnding: ending,
      });
      expect(first.hasNext).toBe(true);
      const second = await listWhatsAppMessages({
        page: 2,
        pageSize: 1,
        phoneEnding: ending,
      });
      expect(second.rows.map((r) => r.id)).toEqual([ids[0]]);
    });
  },
);
