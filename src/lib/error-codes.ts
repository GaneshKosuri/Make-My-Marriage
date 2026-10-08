/**
 * Application error codes and their HTTP statuses (API_DESIGN §8–9).
 *
 * Isomorphic on purpose: the server (`@/server/errors`) and the browser
 * (`@/lib/api-client`) share one list. Where the docs do not name a status,
 * the choice is explained inline.
 */
export const ERROR_CODES = {
  // ── API §8 standard codes ─────────────────────────────────────────────────
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  // Not specified: a malformed/unknown token sent in a request body (e.g. reset-password).
  INVALID_TOKEN: 400,
  // Not specified: the link existed but can no longer be used. 410 Gone says exactly that.
  TOKEN_EXPIRED: 410,
  RATE_LIMITED: 429,
  // Not specified: an uploaded object failed verification (size, MIME, file signature).
  UPLOAD_ERROR: 400,
  // §9 allows 502/503 for provider outages; 503 tells clients the condition is temporary.
  EXTERNAL_SERVICE_ERROR: 503,
  INTERNAL_ERROR: 500,

  // ── Business codes named in the docs ──────────────────────────────────────
  EMAIL_ALREADY_EXISTS: 409,
  ALREADY_HAS_WEDDING: 409,
  LAST_ADMIN: 409,
  // Not specified: asking to RSVP for more people than allowed is invalid input.
  GUEST_LIMIT_EXCEEDED: 400,
  INVITATION_ALREADY_ACCEPTED: 409,
  // Not specified: authenticated, but signed in as someone other than the invitee.
  INVITATION_EMAIL_MISMATCH: 403,
  // API §51 calls this "a friendly validation error" → 400.
  PARTY_SIZE_CHANGED: 400,

  // ── Scaffold only ─────────────────────────────────────────────────────────
  NOT_IMPLEMENTED: 501,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CODES, value);
}
