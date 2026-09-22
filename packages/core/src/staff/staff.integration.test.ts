import { randomUUID } from "node:crypto";
import { getStaffPermissions } from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createRole, updateRolePermissions } from "./role";
import { createStaffUser, updateStaffUser } from "./staffUser";
import { assignStaffRole, unassignStaffRole } from "./staffUserRole";

describe.skipIf(!process.env.DATABASE_URL)(
  "staff & roles writes (integration)",
  { timeout: 20000 },
  () => {
    const createdStaffUserIds: string[] = [];
    const createdRoleIds: string[] = [];
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
      createdStaffUserIds.push(staffUser.id);
    });

    afterAll(async () => {
      await prisma.staffUserRole.deleteMany({
        where: { staffUserId: { in: createdStaffUserIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: createdStaffUserIds } },
      });
      await prisma.staffUser.deleteMany({
        where: { id: { in: createdStaffUserIds } },
      });
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
    });

    afterEach(async () => {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
      createdAuditLogIds.length = 0;
    });

    async function trackAuditLogsFor(entityId: string) {
      const logs = await prisma.auditLog.findMany({ where: { entityId } });
      createdAuditLogIds.push(...logs.map((log) => log.id));
      return logs;
    }

    it("creates a staff user with a hashed password, never logging it in plain form", async () => {
      const staffUser = await createStaffUser(
        {
          email: `test-new-${randomUUID()}@example.com`,
          name: "New Staff",
          initialPassword: "correct horse battery staple",
        },
        actor,
      );
      createdStaffUserIds.push(staffUser.id);

      expect(staffUser.passwordHash).not.toBe("correct horse battery staple");

      const auditLogs = await trackAuditLogsFor(staffUser.id);
      const createLog = auditLogs.find(
        (log) => log.action === "staffUser.create",
      );
      expect(JSON.stringify(createLog?.afterState)).not.toContain(
        "correct horse",
      );
    });

    it("rejects a staff user deactivating their own account", async () => {
      await expect(
        updateStaffUser(actor.staffUserId, { isActive: false }, actor),
      ).rejects.toThrow(/self-deactivate/);
    });

    it("allows one staff user to deactivate another", async () => {
      const other = await createStaffUser(
        {
          email: `test-other-${randomUUID()}@example.com`,
          name: "Other Staff",
          initialPassword: "another-password",
        },
        actor,
      );
      createdStaffUserIds.push(other.id);

      const updated = await updateStaffUser(
        other.id,
        { isActive: false },
        actor,
      );
      expect(updated.isActive).toBe(false);
    });

    it("updateRolePermissions round-trips and takes effect immediately with no stale cache", async () => {
      const role = await createRole(
        { name: `Test Role ${randomUUID()}` },
        actor,
      );
      createdRoleIds.push(role.id);

      const staffUser = await createStaffUser(
        {
          email: `test-role-user-${randomUUID()}@example.com`,
          name: "Role Test User",
          initialPassword: "another-password",
        },
        actor,
      );
      createdStaffUserIds.push(staffUser.id);
      await assignStaffRole(staffUser.id, role.id, actor);

      await updateRolePermissions(role.id, ["inventory:view"], actor);
      let permissions = await getStaffPermissions(staffUser.id);
      expect(permissions).toContain("inventory:view");

      await updateRolePermissions(role.id, [], actor);
      permissions = await getStaffPermissions(staffUser.id);
      expect(permissions).not.toContain("inventory:view");
    });

    it("rejects unassigning a staff user's own last role", async () => {
      const role = await createRole(
        { name: `Test Role ${randomUUID()}` },
        actor,
      );
      createdRoleIds.push(role.id);
      const staffUser = await createStaffUser(
        {
          email: `test-lockout-${randomUUID()}@example.com`,
          name: "Lockout Test User",
          initialPassword: "another-password",
        },
        actor,
      );
      createdStaffUserIds.push(staffUser.id);
      const selfActor = { staffUserId: staffUser.id };
      await assignStaffRole(staffUser.id, role.id, actor);

      await expect(
        unassignStaffRole(staffUser.id, role.id, selfActor),
      ).rejects.toThrow(/self-unassign/);
    });
  },
);
