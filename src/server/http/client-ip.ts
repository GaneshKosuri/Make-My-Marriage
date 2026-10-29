import "server-only";

/**
 * Best-effort client IP for rate limiting. On Vercel, `x-forwarded-for` is set
 * by the platform (client address first). The value is only ever used as an
 * HMAC input for rate-limit keys, never stored or logged. Takes a Request, or
 * `{ headers: await headers() }` in a Server Component.
 */
export function getClientIp(request: { headers: Pick<Headers, "get"> }): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
