import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/galleries/[token] — stub (GET API §80).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API §80. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 6: Memories: ok(await publicGalleryService.getGallery(ctx, params.token))
  handler: () => notImplemented("Phase 6: Memories"),
});
