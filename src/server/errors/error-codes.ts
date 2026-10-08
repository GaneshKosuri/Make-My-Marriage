import "server-only";

import { ERROR_CODES, type ErrorCode } from "@/lib/error-codes";

export { ERROR_CODES, isErrorCode, type ErrorCode } from "@/lib/error-codes";

/** Safe, user-facing default messages. Never include internal detail here. */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Invalid request data",
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "Not found.",
  CONFLICT: "This item was changed by someone else. Reload and try again.",
  INVALID_TOKEN: "This link is invalid.",
  TOKEN_EXPIRED: "This link has expired.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  UPLOAD_ERROR: "The upload could not be verified. Please try again.",
  EXTERNAL_SERVICE_ERROR: "A service we depend on is temporarily unavailable. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  ALREADY_HAS_WEDDING: "You already belong to a wedding.",
  LAST_ADMIN: "A wedding must always have at least one Admin.",
  GUEST_LIMIT_EXCEEDED: "That is more guests than this invitation allows.",
  INVITATION_ALREADY_ACCEPTED: "This invitation has already been accepted.",
  INVITATION_EMAIL_MISMATCH: "This invitation was sent to a different email address.",
  PARTY_SIZE_CHANGED: "The number of guests allowed has changed. Please review and try again.",
  NOT_IMPLEMENTED: "This feature is not available yet.",
};

export function httpStatusFor(code: ErrorCode): number {
  return ERROR_CODES[code];
}
