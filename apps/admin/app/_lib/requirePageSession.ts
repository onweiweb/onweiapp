import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
  getStaffPermissions,
  hasPermission,
} from "@onwei/auth";

export interface PageStaffContext {
  staffUserId: string;
  permissions: string[];
}

/**
 * Page-level counterpart to requireStaffSession (apps/admin/app/api/_lib) —
 * the root layout only checks "is there a session," so read pages showing
 * sensitive data (payments, customers, DSR, consent, audit log) need this
 * finer-grained check too, not just a hidden nav link. Redirects to /login
 * instead of returning a response, since a Server Component page has no
 * response object of its own to short-circuit with.
 */
export async function requirePageSession(
  permission?: string,
): Promise<PageStaffContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;

  const session =
    token && sessionSecret
      ? await verifyStaffSessionToken(token, sessionSecret)
      : null;

  if (!session) {
    redirect("/login");
  }

  const permissions = await getStaffPermissions(session.staffUserId);

  if (permission && !hasPermission(permissions, permission)) {
    redirect("/");
  }

  return { staffUserId: session.staffUserId, permissions };
}
