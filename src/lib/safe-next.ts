/**
 * Where to go after signing in (QA 2026-11-03; binding decision 12): only
 * same-origin paths under /app are accepted, so `?next=` can never become an
 * open redirect. Isomorphic: the proxy, the dashboard guard and the login form
 * share it.
 */

export const NEXT_PARAM = "next";

/** Set by src/proxy.ts on /app requests so the dashboard guard knows the page asked for. */
export const REQUEST_PATH_HEADER = "x-mmm-path";

const BASE = "http://next.invalid";
const APP_PATH = /^\/app(?:\/|$)/;

/** The path to return to, or null when `value` is missing or not a same-origin /app path. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/app") || value.startsWith("//")) return null;
  // Backslashes and control characters are read as "/" or dropped by some browsers.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  // Resolving also normalises "/app/../login" to "/login", which is then refused.
  if (url.origin !== BASE || !APP_PATH.test(url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** "/login", or "/login?next=…" when `path` is a page worth returning to. */
export function signInPathFor(path: string | null | undefined): string {
  const next = safeNextPath(path);
  return next && next !== "/app" ? `/login?${NEXT_PARAM}=${encodeURIComponent(next)}` : "/login";
}
