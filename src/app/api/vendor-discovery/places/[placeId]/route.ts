import { ok, policies, route } from "@/server/http";
import { vendorDiscoveryService } from "@/modules/vendors";
import { placeIdParams } from "@/modules/vendors/vendor.schemas";

/**
 * /api/vendor-discovery/places/:placeId (GET; not in API_DESIGN, added
 * 2026-11-19): one Google place's details to pre-fill the add form, which the
 * family reviews before saving (decided 2026-11-18). Nothing is stored.
 */
export const GET = route({
  auth: "member",
  params: placeIdParams,
  rateLimit: policies.vendorDiscoveryPlace,
  handler: async ({ ctx, params }) =>
    ok(await vendorDiscoveryService.getPlace(ctx, params.placeId)),
});
