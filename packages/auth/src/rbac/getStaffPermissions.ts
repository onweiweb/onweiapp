import { prisma } from "@onwei/database";

/**
 * Every permission key a staff user effectively has. The bootstrapped
 * super-admin (SUPERADMIN_EMAIL) gets every permission in the system
 * automatically — no Role/Permission rows needed for that one account, per
 * docs/ARCHITECTURE.md. Every other staff user's permissions come from the
 * union of their assigned roles.
 *
 * This is the DB lookup that feeds packages/auth/src/rbac/hasPermission.ts's
 * pure `hasPermission`/`hasAllPermissions` checks — those stay DB-free by
 * design; this is where the actual query lives.
 */
export async function getStaffPermissions(
  staffUserId: string,
): Promise<string[]> {
  const staffUser = await prisma.staffUser.findUnique({
    where: { id: staffUserId },
  });
  if (!staffUser || !staffUser.isActive) return [];

  if (
    process.env.SUPERADMIN_EMAIL &&
    staffUser.email === process.env.SUPERADMIN_EMAIL
  ) {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions.map((permission) => permission.key);
  }

  const roles = await prisma.staffUserRole.findMany({
    where: { staffUserId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  const keys = new Set<string>();
  for (const staffUserRole of roles) {
    for (const rolePermission of staffUserRole.role.permissions) {
      keys.add(rolePermission.permission.key);
    }
  }
  return [...keys];
}
