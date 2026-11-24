import { ok, policies, route, tokenParams } from "@/server/http";
import { publicGalleryService } from "@/modules/photos";
import { photoUploadRequestSchema } from "@/modules/photos/photo.schemas";

/**
 * /api/public/galleries/:token/upload-url (POST API §81): a signed PUT for one
 * guest photo. Limited per IP here and per wedding per day in the service.
 */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  body: photoUploadRequestSchema,
  rateLimit: policies.galleryUploadUrl,
  handler: async ({ ctx, params, body }) =>
    ok(await publicGalleryService.requestUploadUrl(ctx, params.token, body)),
});
