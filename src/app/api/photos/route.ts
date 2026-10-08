import { notImplemented, route } from "@/server/http";

/**
 * /api/photos — stub (GET API §75, POST API §77).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 6: Memories.
 */

/** GET — API §75. */
export const GET = route({
  auth: "member",
  // Phase 6: Memories: cursorPaginated(...(await photosService.list(ctx, query)))
  handler: () => notImplemented("Phase 6: Memories"),
});

/** POST — API §77. */
export const POST = route({
  auth: "member",
  // Phase 6: Memories: created(await photosService.confirmUpload(ctx, body))
  handler: () => notImplemented("Phase 6: Memories"),
});
