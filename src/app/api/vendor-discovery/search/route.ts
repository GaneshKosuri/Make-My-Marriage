import { ok, policies, route } from "@/server/http";
import { vendorDiscoveryService } from "@/modules/vendors";
import { discoverySearchQuerySchema } from "@/modules/vendors/vendor.schemas";

/**
 * /api/vendor-discovery/search (GET API §65–66): Google places for a category
 * near a place name (default: the wedding's city), each marked when it is
 * already in My Vendors. Limited per wedding: every call is a billed Google request.
 */
export const GET = route({
  auth: "member",
  query: discoverySearchQuerySchema,
  rateLimit: policies.vendorDiscoverySearch,
  handler: async ({ ctx, query }) => ok(await vendorDiscoveryService.search(ctx, query)),
});
