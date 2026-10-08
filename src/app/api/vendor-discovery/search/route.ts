import { notImplemented, route } from "@/server/http";

/**
 * /api/vendor-discovery/search — stub (GET API §65–66).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §65–66. */
export const GET = route({
  auth: "member",
  // Phase 4: Financial & Vendors: ok(await vendorDiscoveryService.search(ctx, query))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
