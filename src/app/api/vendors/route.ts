import { notImplemented, route } from "@/server/http";

/**
 * /api/vendors — stub (GET API §59, POST API §60).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §59. */
export const GET = route({
  auth: "member",
  // Phase 4: Financial & Vendors: paginated(...(await vendorsService.list(ctx, query)))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** POST — API §60. */
export const POST = route({
  auth: "member",
  // Phase 4: Financial & Vendors: created(await vendorsService.create(ctx, body))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
