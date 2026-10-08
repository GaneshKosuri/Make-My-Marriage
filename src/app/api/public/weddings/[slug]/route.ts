import { notImplemented, route } from "@/server/http";
import { weddingSlugParams } from "@/modules/weddings/wedding.schemas";

/**
 * /api/public/weddings/[slug] — stub (GET API §69).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 5: Wedding Experience.
 */

/** GET — API §69. */
export const GET = route({
  auth: "public",
  params: weddingSlugParams,
  invalidParams: "NOT_FOUND",
  // Phase 5: Wedding Experience: ok(await websiteService.getPublicWebsite(ctx, params.slug))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});
