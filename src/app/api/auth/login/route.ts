import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/login — stub (POST API §12).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §12. */
export const POST = route({
  auth: "public",
  // Phase 1: Foundation: rateLimit: policies.login
  // Phase 1: Foundation: authService.login(ctx, body) → ok(...) + setSessionCookie
  handler: () => notImplemented("Phase 1: Foundation"),
});
