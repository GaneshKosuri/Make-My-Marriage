/**
 * Name of the HttpOnly session cookie (API_DESIGN §10). Kept dependency-free so
 * `src/proxy.ts` can do its cheap "is there a cookie?" redirect without loading
 * server code. The cookie value is never readable from JavaScript.
 */
export const SESSION_COOKIE_NAME = "mmm_session";
