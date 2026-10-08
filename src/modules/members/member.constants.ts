/**
 * Wedding Members (PRD §4, §9.4; DATABASE_DESIGN §23–29). Isomorphic.
 * Single source for Mongoose enums and Zod schemas.
 */

export const MEMBER_ROLES = ["ADMIN", "MANAGER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
};

/** EXPIRED is derived (PENDING and expiresAt < now), never stored (DATABASE_DESIGN §28). */
export const MEMBER_INVITATION_STATUSES = ["PENDING", "ACCEPTED", "REVOKED"] as const;
export type MemberInvitationStatus = (typeof MEMBER_INVITATION_STATUSES)[number];

/** Not specified by the docs; see "Open decisions". */
export const MEMBER_INVITATION_TTL_DAYS = 7;
