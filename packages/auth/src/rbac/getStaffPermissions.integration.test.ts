import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import { getStaffPermissions } from "./getStaffPermissions";

// Runs against the real, shared Neon dev database — every test creates its
// own uniquely-prefixed fixtures and cleans them up afterward, matching
// packages/core/src/catalog/catalog.integration.test.ts's convention.
describe.skipIf(!process.env.DATABASE_URL)(
  "getStaffPermissions (integration)",
  { timeout: 20000 },
  () => {
    const createdStaffUserIds: string[] = [];
    const createdRoleIds: string[] = [];
    const createdPermissionIds: string[] = [];
    const originalSuperadminEmail = process.env.SUPERADMIN_EMAIL;

    afterEach(async () => {
      process.env.SUPERADMIN_EMAIL = originalSuperadminEmail;
      await prisma.staffUserRole.deleteMany({
        where: { staffUserId: { in: createdStaffUserIds } },
      });
      await prisma.rolePermission.deleteMany({
        where: { roleId: { in: createdRoleIds } },
      });
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
      await prisma.permission.deleteMany({
        where: { id: { in: createdPermissionIds } },
      });
      await prisma.staffUser.deleteMany({
        where: { id: { in: createdStaffUserIds } },
      });
      createdStaffUserIds.length = 0;
      createdRoleIds.length = 0;
      createdPermissionIds.length = 0;
    });

    async function createFixtureStaffUser(email?: string) {
      const staffUser = await prisma.staffUser.create({
        data: {
          email: email ?? `test-staff-${randomUUID()}@example.com`,
          passwordHash: "not-a-real-hash",
          name: "Test Staff",
        },
      });
      createdStaffUserIds.push(staffUser.id);
      return staffUser;
    }

    it("returns every permission for the bootstrapped super-admin, with no roles assigned", async () => {
      const email = `test-superadmin-${randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = email;
      const staffUser = await createFixtureStaffUser(email);
      const permission = await prisma.permission.create({
        data: { key: `test:permission:${randomUUID()}` },
      });
      createdPermissionIds.push(permission.id);

      const permissions = await getStaffPermissions(staffUser.id);

      expect(permissions).toContain(permission.key);
    });

    it("returns only the permissions granted via assigned roles for a non-superadmin", async () => {
      process.env.SUPERADMIN_EMAIL = "someone-else@example.com";
      const staffUser = await createFixtureStaffUser();

      const grantedPermission = await prisma.permission.create({
        data: { key: `test:granted:${randomUUID()}` },
      });
      const ungrantedPermission = await prisma.permission.create({
        data: { key: `test:ungranted:${randomUUID()}` },
      });
      createdPermissionIds.push(grantedPermission.id, ungrantedPermission.id);

      const role = await prisma.role.create({
        data: { name: `Test Role ${randomUUID()}` },
      });
      createdRoleIds.push(role.id);
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: grantedPermission.id },
      });
      await prisma.staffUserRole.create({
        data: { staffUserId: staffUser.id, roleId: role.id },
      });

      const permissions = await getStaffPermissions(staffUser.id);

      expect(permissions).toContain(grantedPermission.key);
      expect(permissions).not.toContain(ungrantedPermission.key);
    });

    it("returns an empty list for a staff user with no roles", async () => {
      process.env.SUPERADMIN_EMAIL = "someone-else@example.com";
      const staffUser = await createFixtureStaffUser();

      expect(await getStaffPermissions(staffUser.id)).toEqual([]);
    });

    it("returns an empty list for a deactivated staff user, even if they'd otherwise have roles", async () => {
      process.env.SUPERADMIN_EMAIL = "someone-else@example.com";
      const staffUser = await createFixtureStaffUser();
      await prisma.staffUser.update({
        where: { id: staffUser.id },
        data: { isActive: false },
      });

      expect(await getStaffPermissions(staffUser.id)).toEqual([]);
    });

    it("returns an empty list for an unknown staff user id", async () => {
      expect(await getStaffPermissions(`nonexistent-${randomUUID()}`)).toEqual(
        [],
      );
    });
  },
);
