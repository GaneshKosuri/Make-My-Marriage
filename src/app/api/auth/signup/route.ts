import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/signup — stub (POST API §11).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §11. */
export const POST = route({
  auth: "public",
  // Phase 1: Foundation: rateLimit: policies.signup
  // Phase 1: Foundation: authService.signup(ctx, body) → created(...) + setSessionCookie
  handler: () => notImplemented("Phase 1: Foundation"),
});
