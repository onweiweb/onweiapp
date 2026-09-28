import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { writeAuditLog } from "./auditLog";

describe.skipIf(!process.env.DATABASE_URL)(
  "writeAuditLog (integration)",
  { timeout: 20000 },
  () => {
    const createdAuditLogIds: string[] = [];
    let staffUserId: string;

    beforeAll(async () => {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      staffUserId = staffUser.id;
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
      createdAuditLogIds.length = 0;
    });

    it("writes a row with the given action/entity and JSON-serializes before/after state", async () => {
      const entityId = randomUUID();

      await writeAuditLog({
        staffUserId,
        action: "test.action",
        entityType: "TestEntity",
        entityId,
        beforeState: { quantityOnHand: 10 },
        afterState: { quantityOnHand: 15 },
      });

      const rows = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...rows.map((row) => row.id));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: "STAFF",
        staffUserId,
        action: "test.action",
        entityType: "TestEntity",
        entityId,
        beforeState: { quantityOnHand: 10 },
        afterState: { quantityOnHand: 15 },
      });
    });

    it("omits beforeState/afterState when not given, rather than storing null", async () => {
      const entityId = randomUUID();

      await writeAuditLog({
        staffUserId,
        action: "test.create",
        entityType: "TestEntity",
        entityId,
      });

      const rows = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...rows.map((row) => row.id));

      expect(rows[0]?.beforeState).toBeNull();
      expect(rows[0]?.afterState).toBeNull();
    });

    it("round-trips a Date value in state through JSON (Prisma's Json column can't store a Date instance directly)", async () => {
      const entityId = randomUUID();
      const now = new Date("2026-01-15T00:00:00.000Z");

      await writeAuditLog({
        staffUserId,
        action: "test.date",
        entityType: "TestEntity",
        entityId,
        afterState: { resolvedAt: now as unknown as string },
      });

      const rows = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...rows.map((row) => row.id));

      expect(rows[0]?.afterState).toEqual({
        resolvedAt: now.toISOString(),
      });
    });

    it("commits atomically with the rest of a transaction when a tx client is passed", async () => {
      const entityId = randomUUID();

      await prisma.$transaction(async (tx) => {
        await writeAuditLog(
          {
            staffUserId,
            action: "test.tx",
            entityType: "TestEntity",
            entityId,
          },
          tx,
        );
      });

      const rows = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...rows.map((row) => row.id));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("test.tx");
    });
  },
);
