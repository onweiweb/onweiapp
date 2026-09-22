import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { approveReview, createManualReview, rejectReview } from "./review";

describe.skipIf(!process.env.DATABASE_URL)(
  "reviews writes (integration)",
  { timeout: 20000 },
  () => {
    const createdReviewIds: string[] = [];
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
      await prisma.review.deleteMany({
        where: { id: { in: createdReviewIds } },
      });
      createdReviewIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    it("creates a manual EMAIL review unapproved by default", async () => {
      const review = await createManualReview(
        {
          targetType: "BRAND",
          rating: 5,
          body: "Loved it.",
          authorDisplay: "A Customer",
        },
        actor,
      );
      createdReviewIds.push(review.id);

      expect(review.source).toBe("EMAIL");
      expect(review.isApproved).toBe(false);
    });

    it("approving sets approvedAt/approvedBy and writes an audit log entry", async () => {
      const review = await createManualReview(
        { targetType: "BRAND", rating: 4, body: "Good." },
        actor,
      );
      createdReviewIds.push(review.id);

      const approved = await approveReview(review.id, actor);

      expect(approved.isApproved).toBe(true);
      expect(approved.approvedBy).toBe(actor.staffUserId);
      expect(approved.approvedAt).not.toBeNull();

      const auditLogs = await trackAuditLogsFor(review.id);
      expect(auditLogs.some((log) => log.action === "review.approve")).toBe(
        true,
      );
    });

    it("rejecting an approved review un-publishes it", async () => {
      const review = await createManualReview(
        { targetType: "BRAND", rating: 3, body: "Okay." },
        actor,
      );
      createdReviewIds.push(review.id);
      await approveReview(review.id, actor);

      const rejected = await rejectReview(review.id, actor);

      expect(rejected.isApproved).toBe(false);
      expect(rejected.approvedAt).toBeNull();
      expect(rejected.approvedBy).toBeNull();
    });
  },
);
