import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/reset-password — stub (POST API §16).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §16. */
export const POST = route({
  auth: "public",
  // Phase 1: Foundation: rateLimit: policies.resetPassword
  // Phase 1: Foundation: await authService.resetPassword(ctx, body); return success()
  handler: () => notImplemented("Phase 1: Foundation"),
});
