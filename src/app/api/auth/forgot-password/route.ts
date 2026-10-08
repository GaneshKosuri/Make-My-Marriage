import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/forgot-password — stub (POST API §15).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §15. */
export const POST = route({
  auth: "public",
  // Phase 1: Foundation: rateLimit: policies.forgotPassword
  // Phase 1: Foundation: await authService.forgotPassword(ctx, body); return success()
  handler: () => notImplemented("Phase 1: Foundation"),
});
