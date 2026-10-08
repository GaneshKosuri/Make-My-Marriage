/** Guests, invitations and RSVP (PRD §9.7–9.14; DATABASE_DESIGN §41–48; API_DESIGN §39–52). Isomorphic. */

export const RSVP_STATUSES = ["PENDING", "ATTENDING", "NOT_ATTENDING"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  PENDING: "Pending",
  ATTENDING: "Attending",
  NOT_ATTENDING: "Not Attending",
};

/** Bulk invitation / reminder scopes (API_DESIGN §47). */
export const BULK_EMAIL_SCOPES = ["ALL_UNSENT", "ALL_PENDING_RSVP", "SELECTED"] as const;
export type BulkEmailScope = (typeof BULK_EMAIL_SCOPES)[number];

// API_DESIGN §39 implementation notes (2026-09-16).
export const GUEST_NAME_MAX_LENGTH = 120;
export const GUEST_EMAIL_MAX_LENGTH = 254;
export const GUEST_PHONE_MAX_LENGTH = 40;
export const GUEST_NOTES_MAX_LENGTH = 2000;
export const GUEST_MAX_GUESTS_MIN = 1;
export const GUEST_MAX_GUESTS_MAX = 10_000;
export const GUEST_DEFAULT_MAX_GUESTS = 1;
export const GUEST_MAX_INVITED_EVENTS = 100;
export const GUEST_SEARCH_MAX_LENGTH = 120;
/** Digits and common phone punctuation. */
export const GUEST_PHONE_PATTERN = /^[0-9+()\-.\s]*$/;
