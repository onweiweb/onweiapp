import { redirect } from "next/navigation";
import { hasPermission } from "@onwei/auth";
import { getCurrentStaff } from "./session";

export interface PageStaffContext {
  staffUserId: string;
  permissions: string[];
}

/**
 * Page-level counterpart to requireStaffSession (apps/admin/app/api/_lib),
 * the root layout only checks "is there a session," so read pages showing
 * sensitive data (payments, customers, DSR, consent, audit log) need this
 * finer-grained check too, not just a hidden nav link. Redirects to /login
 * instead of returning a response, since a Server Component page has no
 * response object of its own to short-circuit with.
 *
 * Shares the request's single staff lookup with the layout (see
 * getCurrentStaff), so it adds no extra database query.
 */
export async function requirePageSession(
  permission?: string,
): Promise<PageStaffContext> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  if (permission && !hasPermission(staff.permissions, permission)) {
    redirect("/");
  }

  return { staffUserId: staff.staffUserId, permissions: staff.permissions };
}
