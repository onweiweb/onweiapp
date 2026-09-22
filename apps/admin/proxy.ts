import {
  STAFF_SESSION_COOKIE_NAME,
  verifyStaffSessionToken,
} from "@onwei/auth";
import { NextResponse, type NextRequest } from "next/server";

// Route-level gate rather than a per-page check: every admin route needs a
// valid staff session except /login itself and the login/logout API routes
// (which must be reachable while signed out).
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const sessionSecret = process.env.ADMIN_SESSION_JWT_SECRET;
  const session =
    token && sessionSecret
      ? await verifyStaffSessionToken(token, sessionSecret)
      : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Sign in to continue." },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
