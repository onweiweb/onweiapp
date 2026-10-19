import { cache } from "react";
import { cookies } from "next/headers";
import {
  getStaffAccess,
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
} from "@onwei/auth";
import type { StaffAccess } from "@onwei/auth";

export interface CurrentStaff extends StaffAccess {
  staffUserId: string;
}

/**
 * The signed-in staff member for this request, or null. Wrapped in React's
 * `cache`, so the layout and the page that both ask share one lookup (one
 * database round trip) instead of each making their own.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;
  if (!token || !sessionSecret) return null;

  const session = await verifyStaffSessionToken(token, sessionSecret);
  if (!session) return null;

  const access = await getStaffAccess(session.staffUserId);
  if (!access || !access.isActive) return null;
  return { staffUserId: session.staffUserId, ...access };
});
