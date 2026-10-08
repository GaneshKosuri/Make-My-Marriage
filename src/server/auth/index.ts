import "server-only";

export { authenticate } from "./authenticate";
export { getCurrentContext, type CurrentContext } from "./context";
export {
  clearSessionCookie,
  readSessionToken,
  readSessionTokenFromCookies,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "./cookies";
export {
  configureIdentity,
  getIdentity,
  resetIdentityForTests,
  type IdentityDirectory,
  type IdentityMembership,
  type IdentityPorts,
  type IdentityUser,
  type IdentityWedding,
  type SessionRecord,
  type SessionStore,
} from "./identity";
export {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  resolveSession,
  SESSION_TOUCH_INTERVAL_MS,
  type CreatedSession,
} from "./session";
export type {
  AuthLevel,
  ContextFor,
  InternalContext,
  MemberContext,
  MembershipRole,
  PublicContext,
  UserContext,
} from "./types";
