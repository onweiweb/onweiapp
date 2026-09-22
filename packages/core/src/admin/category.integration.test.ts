import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createCategory, updateCategory } from "./category";

// Runs against the real, shared Neon dev database — matches
// packages/core/src/catalog/catalog.integration.test.ts's convention.
describe.skipIf(!process.env.DATABASE_URL)(
  "admin category writes (integration)",
  { timeout: 20000 },
  () => {
    const createdCategoryIds: string[] = [];
    const createdAuditLogIds: string[] = [];
    // AuditLog.staffUserId has a real FK to StaffUser, so the actor must be
    // a real row, not just any string id.
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
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
      createdCategoryIds.length = 0;
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    it("creates a category and writes an audit log entry", async () => {
      const slug = `test-category-${randomUUID()}`;

      const category = await createCategory(
        { name: "Test Category", slug },
        actor,
      );
      createdCategoryIds.push(category.id);

      expect(category.slug).toBe(slug);
      expect(category.isActive).toBe(true);

      const logs = await trackAuditLogsFor(category.id);
      expect(logs).toHaveLength(1);
      expect(logs[0]!.action).toBe("category.create");
      expect(logs[0]!.staffUserId).toBe(actor.staffUserId);
    });

    it("updates a category and writes an audit log entry with before/after state", async () => {
      const slug = `test-category-${randomUUID()}`;
      const category = await createCategory(
        { name: "Original Name", slug },
        actor,
      );
      createdCategoryIds.push(category.id);
      await trackAuditLogsFor(category.id);

      const updated = await updateCategory(
        category.id,
        { name: "Updated Name", isActive: false },
        actor,
      );

      expect(updated.name).toBe("Updated Name");
      expect(updated.isActive).toBe(false);

      const logs = await trackAuditLogsFor(category.id);
      const updateLog = logs.find((log) => log.action === "category.update");
      expect(updateLog).toBeDefined();
      expect((updateLog!.beforeState as { name: string }).name).toBe(
        "Original Name",
      );
      expect((updateLog!.afterState as { name: string }).name).toBe(
        "Updated Name",
      );
    });
  },
);
