/**
 * Bulk email jobs (SYSTEM_DESIGN §47–54; DATABASE_DESIGN §66–75; API_DESIGN §85–87).
 * Isomorphic. Only bulk guest invitations/reminders are queued; single
 * transactional emails are sent immediately.
 */

export const EMAIL_JOB_TYPES = ["GUEST_INVITATION", "RSVP_REMINDER"] as const;
export type EmailJobType = (typeof EMAIL_JOB_TYPES)[number];

export const EMAIL_JOB_STATUSES = ["PENDING", "PROCESSING", "SENT", "FAILED", "CANCELLED"] as const;
export type EmailJobStatus = (typeof EMAIL_JOB_STATUSES)[number];

/** Attempt 1 immediately, attempt 2 after 5 min, attempt 3 after 30 min, then FAILED (DATABASE_DESIGN §74). */
export const EMAIL_JOB_MAX_ATTEMPTS = 3;
export const EMAIL_JOB_RETRY_DELAYS_MINUTES = [0, 5, 30] as const;

/** PROCESSING jobs locked longer than this are reclaimed (DATABASE_DESIGN §73: 10–15 min). */
export const EMAIL_JOB_STALE_LOCK_MINUTES = 15;

/** Batch ids are 16 random bytes, base64url (22 chars). */
export const EMAIL_BATCH_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const EMAIL_JOB_LAST_ERROR_MAX_LENGTH = 1000;
