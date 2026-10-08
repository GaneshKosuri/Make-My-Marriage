import { notImplemented, route } from "@/server/http";
import { photoIdParams } from "@/modules/photos/photo.schemas";

/**
 * /api/photos/[photoId] — stub (DELETE API §78).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** DELETE — API §78. */
export const DELETE = route({
  auth: "member",
  params: photoIdParams,
  // Phase 6: Memories: await photosService.delete(ctx, params.photoId); return ok({ success: true })
  handler: () => notImplemented("Phase 6: Memories"),
});
