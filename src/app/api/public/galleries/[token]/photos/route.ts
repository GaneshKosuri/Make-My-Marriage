import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/galleries/[token]/photos — stub (GET API §79, POST API §82).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API §79. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 6: Memories: cursorPaginated(...(await publicGalleryService.listPhotos(ctx, params.token, query)))
  handler: () => notImplemented("Phase 6: Memories"),
});

/** POST — API §82. */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 6: Memories: rateLimit: policies.galleryPhotoConfirm
  // Phase 6: Memories: created(await publicGalleryService.confirmUpload(ctx, params.token, body))
  handler: () => notImplemented("Phase 6: Memories"),
});
