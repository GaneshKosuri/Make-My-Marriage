import "server-only";

/**
 * The HTTP toolkit for `src/app/api/**\/route.ts`. Route handlers import
 * infrastructure ONLY from here (dependency rule 1).
 */

export { MAX_JSON_BODY_BYTES, readJsonBody } from "./body";
export { getClientIp } from "./client-ip";
export { getHealthReport, type HealthReport } from "./health";
export { assertSameOrigin } from "./origin";
export {
  afterCursorFilter,
  buildPagePagination,
  CURSOR_DEFAULT_LIMIT,
  CURSOR_MAX_LIMIT,
  cursorQuerySchema,
  decodeCursor,
  encodeCursor,
  PAGE_DEFAULT_LIMIT,
  PAGE_MAX,
  PAGE_MAX_LIMIT,
  pageQuerySchema,
  pageSkip,
  sliceCursorPage,
  type CursorPagination,
  type CursorPosition,
  type CursorQuery,
  type PagePagination,
  type PageQuery,
} from "./pagination";
export { objectId, tokenParam, tokenParams } from "./params";
export {
  created,
  cursorPaginated,
  errorResponse,
  noContent,
  notImplemented,
  ok,
  paginated,
  success,
} from "./responses";
export {
  route,
  searchParamsToObject,
  type HandlerArgs,
  type InvalidParamsError,
  type RouteConfig,
  type RouteHandler,
  type RouteHandlerContext,
  type RouteMetadata,
} from "./route";
export { zodErrorToDetails, type ValidationSource } from "./validation";

// Re-exported so route handlers never need another @/server import.
export { clearSessionCookie, setSessionCookie } from "@/server/auth/cookies";
export type {
  AuthLevel,
  InternalContext,
  MemberContext,
  PublicContext,
  UserContext,
} from "@/server/auth/types";
export { policies, type RateLimitPolicy } from "@/server/security/rate-limit";
