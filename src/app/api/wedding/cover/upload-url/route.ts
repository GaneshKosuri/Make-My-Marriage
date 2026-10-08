import { notImplemented, route } from "@/server/http";

/**
 * /api/wedding/cover/upload-url — stub (POST API §83).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 5: Wedding Experience.
 */

/** POST — API §83. */
export const POST = route({
  auth: "member",
  // Phase 5: Wedding Experience: ok(await weddingsService.requestCoverUploadUrl(ctx, body))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});
