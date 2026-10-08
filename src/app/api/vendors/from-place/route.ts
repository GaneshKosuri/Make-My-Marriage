import { notImplemented, route } from "@/server/http";

/**
 * /api/vendors/from-place — stub (POST API §61).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** POST — API §61. */
export const POST = route({
  auth: "member",
  // Phase 4: Financial & Vendors: created(await vendorsService.createFromPlace(ctx, body))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
