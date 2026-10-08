import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/galleries/[token]/upload-url — stub (POST API §81).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** POST — API §81. */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 6: Memories: rateLimit: policies.galleryUploadUrl
  // Phase 6: Memories: ok(await publicGalleryService.requestUploadUrl(ctx, params.token, body))
  handler: () => notImplemented("Phase 6: Memories"),
});
