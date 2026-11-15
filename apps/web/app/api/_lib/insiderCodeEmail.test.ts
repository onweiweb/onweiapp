// @vitest-environment node
import { assignInsiderCode } from "@onwei/core";
import { prisma } from "@onwei/database";
import type { EmailSender } from "@onwei/emails";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sendInsiderCodeEmailNow } from "./insiderCodeEmail";

// Test rows only: fake names, example.test emails, cleaned up afterwards.
describe.skipIf(!process.env.DATABASE_URL)(
  "Insider code email at signup",
  { timeout: 30000 },
  () => {
    const ids: string[] = [];

    async function makeMember(): Promise<string> {
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `test-signup-code-${crypto.randomUUID()}@example.test`,
          phone: `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
          consentVersion: "test",
          submittedAt: new Date("2001-01-01T00:00:00Z"),
        },
      });
      ids.push(row.id);
      await assignInsiderCode(row.id);
      return row.id;
    }

    beforeAll(() => {
      vi.stubEnv("INSIDER_LINK_SECRET", "x".repeat(40));
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.onwei.in");
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      // Hand back any printed cards the test members took.
      await prisma.insiderCode.updateMany({
        where: { waitlistEntryId: { in: ids } },
        data: { waitlistEntryId: null, assignedAt: null },
      });
      await prisma.waitlistEntry.deleteMany({ where: { id: { in: ids } } });
    });

    it("sends the code email once and marks it sent", async () => {
      const id = await makeMember();
      const send = vi.fn<EmailSender["send"]>().mockResolvedValue();
      expect(await sendInsiderCodeEmailNow(id, { send })).toBe("sent");
      const entry = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id },
      });
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0]?.[0]).toBe(entry.email);
      expect(send.mock.calls[0]?.[1].text).toContain(entry.insiderCode!);
      expect(entry.codeEmailedAt).not.toBeNull();

      // A second call (or a later bulk send) never emails them again.
      expect(await sendInsiderCodeEmailNow(id, { send })).toBe("skipped");
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("leaves the member for a manual send when sending fails", async () => {
      const id = await makeMember();
      const send = vi
        .fn<EmailSender["send"]>()
        .mockRejectedValue(new Error("Resend responded 500"));
      expect(await sendInsiderCodeEmailNow(id, { send })).toBe("failed");
      const entry = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id },
      });
      expect(entry.codeEmailedAt).toBeNull();
      expect(entry.codeEmailClaimedAt).toBeNull();
    });

    it("skips without the Insider sender set up", async () => {
      const id = await makeMember();
      expect(await sendInsiderCodeEmailNow(id, null)).toBe("skipped");
      const entry = await prisma.waitlistEntry.findUniqueOrThrow({
        where: { id },
      });
      expect(entry.codeEmailClaimedAt).toBeNull();
    });
  },
);
