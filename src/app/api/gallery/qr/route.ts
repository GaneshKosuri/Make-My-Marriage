import { notImplemented, route } from "@/server/http";

/**
 * /api/gallery/qr — stub (GET API §84).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API §84. */
export const GET = route({
  auth: "member",
  // Phase 6: Memories: ok(await gallerySettingsService.getQr(ctx))
  handler: () => notImplemented("Phase 6: Memories"),
});
