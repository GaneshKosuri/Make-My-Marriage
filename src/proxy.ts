import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_PATH_HEADER, signInPathFor } from "@/lib/safe-next";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * Cheap optimistic redirect for /app/* and /create-wedding: no session cookie → /login,
 * with `?next=` so signing in returns to the page asked for (only /app paths).
 * It never validates the session (no database access here). The real checks
 * are the dashboard layout guard and `route({ auth })` on every API call; the
 * guard reads the requested path from REQUEST_PATH_HEADER for the same purpose.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const path = `${pathname}${search}`;
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL(signInPathFor(path), request.url));
  }
  // Always overwrite: a client-sent value must never reach the guard.
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, path);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/app/:path*", "/create-wedding"],
};
