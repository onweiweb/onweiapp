import { prisma } from "@onwei/database";

export interface StaffAccess {
  name: string;
  email: string;
  isActive: boolean;
  permissions: string[];
}

/**
 * Who a staff user is and everything they may do, in one database round trip
 * (the staff row, their roles and the full permission list are fetched
 * together). Admin pages call this on every request, so it avoids the
 * several back-to-back queries the old separate lookups made.
 *
 * Same rules as getStaffPermissions: an inactive or missing user has no
 * permissions, and the bootstrapped super-admin (SUPERADMIN_EMAIL) has all.
 */
export async function getStaffAccess(
  staffUserId: string,
): Promise<StaffAccess | null> {
  const [staffUser, allPermissions] = await Promise.all([
    prisma.staffUser.findUnique({
      where: { id: staffUserId },
      select: {
        name: true,
        email: true,
        isActive: true,
        roles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.permission.findMany({ select: { key: true } }),
  ]);

  if (!staffUser) return null;
  if (!staffUser.isActive) {
    return {
      name: staffUser.name,
      email: staffUser.email,
      isActive: false,
      permissions: [],
    };
  }

  const isSuperAdmin =
    !!process.env.SUPERADMIN_EMAIL &&
    staffUser.email === process.env.SUPERADMIN_EMAIL;

  const keys = new Set<string>();
  if (isSuperAdmin) {
    for (const permission of allPermissions) keys.add(permission.key);
  } else {
    for (const staffUserRole of staffUser.roles) {
      for (const rolePermission of staffUserRole.role.permissions) {
        keys.add(rolePermission.permission.key);
      }
    }
  }

  return {
    name: staffUser.name,
    email: staffUser.email,
    isActive: true,
    permissions: [...keys],
  };
}
