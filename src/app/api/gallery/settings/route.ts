import { notImplemented, route } from "@/server/http";

/**
 * /api/gallery/settings — stub (GET API §73, PATCH API §74).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API §73. */
export const GET = route({
  auth: "member",
  // Phase 6: Memories: ok(await gallerySettingsService.getSettings(ctx))
  handler: () => notImplemented("Phase 6: Memories"),
});

/** PATCH — API §74. */
export const PATCH = route({
  auth: "member",
  // Phase 6: Memories: ok(await gallerySettingsService.updateSettings(ctx, body))
  handler: () => notImplemented("Phase 6: Memories"),
});
