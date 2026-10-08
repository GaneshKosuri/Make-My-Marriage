import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Cheap optimistic redirect for /app/*: no session cookie → /login.
 * It never validates the session (no database access here). The real checks
 * are the dashboard layout guard and `route({ auth })` on every API call.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/app/:path*"],
};
