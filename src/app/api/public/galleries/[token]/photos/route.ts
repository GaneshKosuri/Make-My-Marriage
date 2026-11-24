import { created, cursorPaginated, policies, route, tokenParams } from "@/server/http";
import { publicGalleryService } from "@/modules/photos";
import { confirmPhotoUploadSchema, listPhotosQuerySchema } from "@/modules/photos/photo.schemas";

/** /api/public/galleries/:token/photos (GET API §79, POST API §82). */

/** GET — gallery-safe photos by album, cursor pages. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  query: listPhotosQuerySchema,
  rateLimit: policies.publicGalleryView,
  handler: async ({ ctx, params, query }) => {
    const { items, pagination } = await publicGalleryService.listPhotos(ctx, params.token, query);
    return cursorPaginated(items, pagination);
  },
});

/** POST — confirm a guest's direct upload (uploaderType GUEST). */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  body: confirmPhotoUploadSchema,
  rateLimit: policies.galleryPhotoConfirm,
  handler: async ({ ctx, params, body }) =>
    created(await publicGalleryService.confirmUpload(ctx, params.token, body)),
});
