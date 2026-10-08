import { notImplemented, route } from "@/server/http";
import { photoIdParams } from "@/modules/photos/photo.schemas";

/**
 * /api/photos/[photoId]/download — stub (GET API 2026-09-18 notes).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API 2026-09-18 notes. */
export const GET = route({
  auth: "member",
  params: photoIdParams,
  // Phase 6: Memories: ok(await photosService.getDownloadUrl(ctx, params.photoId))
  handler: () => notImplemented("Phase 6: Memories"),
});
