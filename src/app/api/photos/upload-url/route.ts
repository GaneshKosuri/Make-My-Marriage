import { notImplemented, route } from "@/server/http";

/**
 * /api/photos/upload-url — stub (POST API §76).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** POST — API §76. */
export const POST = route({
  auth: "member",
  // Phase 6: Memories: photosService.requestUploadUrl consumes policies.photoUploadPerMember, then policies.photoUploadPerWedding, AFTER validation (2026-09-18 notes)
  // Phase 6: Memories: ok(await photosService.requestUploadUrl(ctx, body))
  handler: () => notImplemented("Phase 6: Memories"),
});
