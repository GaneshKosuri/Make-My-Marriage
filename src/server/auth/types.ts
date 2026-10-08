import "server-only";

/**
 * Request contexts produced by `route()` for each auth level. Services take
 * the context as their first argument; for wedding-owned data, `weddingId`
 * comes ONLY from MemberContext (API_DESIGN §2.3), never from the client.
 */

/** Mirrors MEMBER_ROLES in modules/members (src/server cannot import modules). */
export type MembershipRole = "ADMIN" | "MANAGER";

export type AuthLevel = "public" | "user" | "member" | "admin" | "internal";

export interface PublicContext {
  requestId: string;
}

export interface InternalContext {
  requestId: string;
}

/** A signed-in user who may or may not belong to a wedding yet. */
export interface UserContext {
  requestId: string;
  userId: string;
  sessionId: string;
}

/** A signed-in Wedding Member. The single source of wedding (tenant) context. */
export interface MemberContext {
  requestId: string;
  userId: string;
  membershipId: string;
  weddingId: string;
  role: MembershipRole;
}

export type ContextFor<A extends AuthLevel> = A extends "member" | "admin"
  ? MemberContext
  : A extends "user"
    ? UserContext
    : A extends "internal"
      ? InternalContext
      : PublicContext;
