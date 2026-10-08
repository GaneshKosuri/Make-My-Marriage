import { notImplemented, route } from "@/server/http";

/**
 * /api/auth/me — stub (GET API §14).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §14. */
export const GET = route({
  auth: "user",
  // Phase 1: Foundation: ok(await authService.me(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});
