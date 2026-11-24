import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_PATH_HEADER, signInPathFor } from "@/lib/safe-next";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/** A path with no page: rewriting to it renders the app's 404 with a real 404 status. */
export const WEBSITE_NOT_FOUND_PATH = "/_website-not-found";

/**
 * Runs before any page renders (Next 16 Proxy, Node runtime).
 *
 * - `/w/<slug>`: unknown, unpublished, deleted and malformed websites get a
 *   real 404. The page itself streams under Cache Components, so by the time it
 *   could call `notFound()` the status is already 200 (QA W1). One cheap
 *   existence check; on a database error the page decides (it shows "busy").
 * - `/app/*` and `/create-wedding`: cheap optimistic redirect without a session
 *   cookie → /login, with `?next=` so signing in returns to the page asked for
 *   (only /app paths). It never validates the session; the real checks are the
 *   dashboard layout guard and `route({ auth })` on every API call. The guard
 *   reads the requested path from REQUEST_PATH_HEADER for the same purpose.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/w/")) return websiteGate(request, pathname.slice("/w/".length));

  const path = `${pathname}${search}`;
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL(signInPathFor(path), request.url));
  }
  // Always overwrite: a client-sent value must never reach the guard.
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, path);
  return NextResponse.next({ request: { headers } });
}

/** Whether a slug is a published website; imported lazily so /app never loads server modules. */
async function publishedWebsite(slug: string): Promise<boolean> {
  const { websiteService } = await import("@/modules/weddings");
  return websiteService.isPublished(slug);
}

/** The /w/ decision, with the lookup passed in (tests use their own). */
export async function websiteGate(
  request: NextRequest,
  slug: string,
  isPublished: (slug: string) => Promise<boolean> = publishedWebsite,
) {
  let published: boolean;
  try {
    published = !slug.includes("/") && (await isPublished(slug));
  } catch {
    return NextResponse.next();
  }
  return published
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(WEBSITE_NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: ["/app/:path*", "/create-wedding", "/w/:path*"],
};
