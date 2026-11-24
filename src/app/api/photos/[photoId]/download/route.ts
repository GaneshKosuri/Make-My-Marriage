import { ok, route } from "@/server/http";
import { photosService } from "@/modules/photos";
import { photoIdParams } from "@/modules/photos/photo.schemas";

/**
 * /api/photos/:photoId/download (GET, 2026-09-18 notes): a short-lived signed
 * link that downloads the original; the app never proxies the photo.
 */
export const GET = route({
  auth: "member",
  params: photoIdParams,
  handler: async ({ ctx, params }) => ok(await photosService.getDownloadUrl(ctx, params.photoId)),
});
