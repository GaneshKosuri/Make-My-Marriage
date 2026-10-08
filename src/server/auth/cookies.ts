import "server-only";

import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * The `mmm_session` cookie (API_DESIGN §10): HttpOnly, Secure in production,
 * SameSite=Lax, Path=/. It carries only the random session token; the database
 * stores its HMAC.
 */
function sessionCookieAttributes(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieAttributes(expiresAt));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieAttributes(new Date(0)),
    maxAge: 0,
  });
}

/** Route handlers: read the raw token from the incoming request. */
export function readSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

/** Server Components / layouts: read the raw token via next/headers. */
export async function readSessionTokenFromCookies(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value || null;
}
