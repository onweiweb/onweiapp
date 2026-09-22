import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
  getStaffPermissions,
  hasPermission,
} from "@onwei/auth";
import { NextResponse } from "next/server";

export interface StaffContext {
  staffUserId: string;
  permissions: string[];
}

export type StaffSessionResult =
  { ok: true; context: StaffContext } | { ok: false; response: NextResponse };

/**
 * Verifies the caller's session cookie and, if `permission` is given, that
 * they actually have it — a staff user without the permission gets a 403
 * from the route itself, not just a hidden button (docs/TEST_PLAN.md's RBAC
 * section). apps/admin/proxy.ts already blocks requests with no session at
 * all; this is the finer-grained per-route permission check on top of that.
 */
export async function requireStaffSession(
  request: Request,
  permission?: string,
): Promise<StaffSessionResult> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, STAFF_SESSION_COOKIE_NAME);
  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;

  const session =
    token && sessionSecret
      ? await verifyStaffSessionToken(token, sessionSecret)
      : null;

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Sign in to continue." },
        { status: 401 },
      ),
    };
  }

  const permissions = await getStaffPermissions(session.staffUserId);

  if (permission && !hasPermission(permissions, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "You don't have permission to do that.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: { staffUserId: session.staffUserId, permissions },
  };
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
