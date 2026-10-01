import { prisma } from "@onwei/database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSiteSetting, updateSiteSetting } from "./siteSetting";

describe.skipIf(!process.env.DATABASE_URL)(
  "siteSetting (integration)",
  { timeout: 20000 },
  () => {
    let original: Awaited<
      ReturnType<typeof prisma.siteSetting.findUniqueOrThrow>
    >;
    let staffUserId: string;

    beforeEach(async () => {
      original = await prisma.siteSetting.findUniqueOrThrow({
        where: { id: "singleton" },
      });
      // AuditLog.staffUserId is a real FK, reuse the seeded super-admin
      // rather than a fabricated id, which would violate the constraint.
      const staffUser = await prisma.staffUser.findFirstOrThrow();
      staffUserId = staffUser.id;
    });

    afterEach(async () => {
      // Goes through updateSiteSetting (not a raw prisma.update) so the
      // module-level cache is cleared too, not just the DB row.
      await updateSiteSetting(
        {
          siteMode: original.siteMode,
          launchAt: original.launchAt,
          showCountdown: original.showCountdown,
          allowInternationalPhone: original.allowInternationalPhone,
        },
        { staffUserId },
      );
    });

    it("reads the seeded singleton row", async () => {
      const setting = await getSiteSetting();
      expect(setting.siteMode).toBeDefined();
      expect(setting.launchAt).toBeInstanceOf(Date);
    });

    it("saves the countdown on/off switch", async () => {
      const off = await updateSiteSetting(
        { showCountdown: false },
        { staffUserId },
      );
      expect(off.showCountdown).toBe(false);
      expect((await getSiteSetting()).showCountdown).toBe(false);
    });

    it("updates fields and writes an audit log entry", async () => {
      const before = await prisma.auditLog.count({
        where: { entityType: "SiteSetting" },
      });

      const updated = await updateSiteSetting(
        { siteMode: "PREORDERS", allowInternationalPhone: false },
        { staffUserId },
      );

      expect(updated.siteMode).toBe("PREORDERS");
      expect(updated.allowInternationalPhone).toBe(false);

      const after = await prisma.auditLog.count({
        where: { entityType: "SiteSetting" },
      });
      expect(after).toBe(before + 1);

      const fresh = await getSiteSetting();
      expect(fresh.siteMode).toBe("PREORDERS");
    });
  },
);
