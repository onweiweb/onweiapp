import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createCoupon, updateCoupon } from "./coupon";
import { addDiscountRule, updateDiscountRule } from "./discountRule";

describe.skipIf(!process.env.DATABASE_URL)(
  "discounts writes (integration)",
  { timeout: 20000 },
  () => {
    const createdCouponIds: string[] = [];
    const createdRuleIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    let actor: { staffUserId: string };

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      actor = { staffUserId: staffUser.id };
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: actor.staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
      await prisma.discountRule.deleteMany({
        where: { id: { in: createdRuleIds } },
      });
      await prisma.coupon.deleteMany({
        where: { id: { in: createdCouponIds } },
      });
      createdCouponIds.length = 0;
      createdRuleIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    it("creates and updates a coupon, writing an audit log entry each time", async () => {
      const coupon = await createCoupon(
        { code: `TEST-${randomUUID()}` },
        actor,
      );
      createdCouponIds.push(coupon.id);
      expect(coupon.isActive).toBe(true);

      const updated = await updateCoupon(coupon.id, { isActive: false }, actor);
      expect(updated.isActive).toBe(false);

      const auditLogs = await trackAuditLogsFor(coupon.id);
      expect(auditLogs.some((log) => log.action === "coupon.create")).toBe(
        true,
      );
      expect(auditLogs.some((log) => log.action === "coupon.update")).toBe(
        true,
      );
    });

    it("adds a valid PERCENTAGE rule to a coupon", async () => {
      const coupon = await createCoupon(
        { code: `TEST-${randomUUID()}` },
        actor,
      );
      createdCouponIds.push(coupon.id);

      const rule = await addDiscountRule(
        coupon.id,
        { type: "PERCENTAGE", config: { percentage: 20 } },
        actor,
      );
      createdRuleIds.push(rule.id);

      expect(rule.config).toEqual({ percentage: 20 });

      const auditLogs = await trackAuditLogsFor(rule.id);
      expect(
        auditLogs.some((log) => log.action === "discountRule.create"),
      ).toBe(true);
    });

    it("rejects a rule whose config doesn't match its type's schema", async () => {
      const coupon = await createCoupon(
        { code: `TEST-${randomUUID()}` },
        actor,
      );
      createdCouponIds.push(coupon.id);

      await expect(
        addDiscountRule(
          coupon.id,
          { type: "PERCENTAGE", config: { percentage: 500 } },
          actor,
        ),
      ).rejects.toThrow(/invalid-config/);
    });

    it("adds a valid BUY_X_GET_Y rule and updates it", async () => {
      const coupon = await createCoupon(
        { code: `TEST-${randomUUID()}` },
        actor,
      );
      createdCouponIds.push(coupon.id);

      const rule = await addDiscountRule(
        coupon.id,
        { type: "BUY_X_GET_Y", config: { buyQty: 2, getQty: 1 } },
        actor,
      );
      createdRuleIds.push(rule.id);

      const updated = await updateDiscountRule(
        rule.id,
        { config: { buyQty: 3, getQty: 1 } },
        actor,
      );
      expect(updated.config).toEqual({ buyQty: 3, getQty: 1 });
    });
  },
);
