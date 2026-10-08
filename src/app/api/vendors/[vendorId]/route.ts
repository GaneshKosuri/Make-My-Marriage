import { notImplemented, route } from "@/server/http";
import { vendorIdParams } from "@/modules/vendors/vendor.schemas";

/**
 * /api/vendors/[vendorId] — stub (GET API §62, PATCH API §63, DELETE API §64).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §62. */
export const GET = route({
  auth: "member",
  params: vendorIdParams,
  // Phase 4: Financial & Vendors: ok(await vendorsService.get(ctx, params.vendorId))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** PATCH — API §63. */
export const PATCH = route({
  auth: "member",
  params: vendorIdParams,
  // Phase 4: Financial & Vendors: ok(await vendorsService.update(ctx, params.vendorId, body))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** DELETE — API §64. */
export const DELETE = route({
  auth: "member",
  params: vendorIdParams,
  // Phase 4: Financial & Vendors: await vendorsService.archive(ctx, params.vendorId); return success()
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
