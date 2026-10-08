/**
 * Auth limits (PRD §9.1, API_DESIGN §11–16). Isomorphic: shared by Mongoose
 * models, Zod schemas and client forms.
 */

export const USER_NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
/** Upper bound keeps hashing cost bounded; argon2 itself accepts more. */
export const PASSWORD_MAX_LENGTH = 128;

/** Password-reset links are single-use and short-lived (DATABASE_DESIGN §12). */
export const PASSWORD_RESET_TTL_MINUTES = 60;
