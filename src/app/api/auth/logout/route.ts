import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/logout — stub (POST API §13).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §13. */
export const POST = route({
  auth: "user",
  // Phase 1: Foundation: authService.logout(ctx, token) → success() + clearSessionCookie
  handler: () => notImplemented("Phase 1: Foundation"),
});
