import { ok, policies, route, tokenParams } from "@/server/http";
import { publicGalleryService } from "@/modules/photos";

/**
 * /api/public/galleries/:token (GET API §80): the couple, whether guests can
 * upload, and the albums. A closed or unknown gallery is 404.
 */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  rateLimit: policies.publicGalleryView,
  handler: async ({ ctx, params }) => ok(await publicGalleryService.getGallery(ctx, params.token)),
});
