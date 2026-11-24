import { ok, route } from "@/server/http";
import { photosService } from "@/modules/photos";
import { photoIdParams } from "@/modules/photos/photo.schemas";

/** /api/photos/:photoId (DELETE API §78 + 2026-09-18 notes). */

/** DELETE — removes the photo from storage, then from the gallery. */
export const DELETE = route({
  auth: "member",
  params: photoIdParams,
  handler: async ({ ctx, params }) => {
    await photosService.delete(ctx, params.photoId);
    return ok({ success: true });
  },
});
