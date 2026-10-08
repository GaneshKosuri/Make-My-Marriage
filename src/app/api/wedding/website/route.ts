import { notImplemented, route } from "@/server/http";

/**
 * /api/wedding/website — stub (GET API §67, PATCH API §68).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 5: Wedding Experience.
 */

/** GET — API §67. */
export const GET = route({
  auth: "member",
  // Phase 5: Wedding Experience: ok(await websiteService.getSettings(ctx))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});

/** PATCH — API §68. */
export const PATCH = route({
  auth: "member",
  // Phase 5: Wedding Experience: ok(await websiteService.updateSettings(ctx, body))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});
