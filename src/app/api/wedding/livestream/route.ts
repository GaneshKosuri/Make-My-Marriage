import { notImplemented, route } from "@/server/http";

/**
 * /api/wedding/livestream — stub (GET API §70, PATCH API §71–72).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 5: Wedding Experience.
 */

/** GET — API §70. */
export const GET = route({
  auth: "member",
  // Phase 5: Wedding Experience: ok(await livestreamService.getSettings(ctx))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});

/** PATCH — API §71–72. */
export const PATCH = route({
  auth: "member",
  // Phase 5: Wedding Experience: ok(await livestreamService.updateSettings(ctx, body))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});
