import { getStaffAccess } from "./getStaffAccess";

/**
 * Every permission key a staff user effectively has. The bootstrapped
 * super-admin (SUPERADMIN_EMAIL) gets every permission in the system
 * automatically, no Role/Permission rows needed for that one account, per
 * docs/ARCHITECTURE.md. Every other staff user's permissions come from the
 * union of their assigned roles. An inactive or missing user has none.
 *
 * This feeds packages/auth/src/rbac/hasPermission.ts's pure checks, those
 * stay DB-free by design; the query itself lives in getStaffAccess.
 */
export async function getStaffPermissions(
  staffUserId: string,
): Promise<string[]> {
  const access = await getStaffAccess(staffUserId);
  return access?.permissions ?? [];
}
