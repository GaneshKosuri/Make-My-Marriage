import { created, policies, route } from "@/server/http";
import { vendorsService } from "@/modules/vendors";
import { addVendorFromPlaceSchema } from "@/modules/vendors/vendor.schemas";

/**
 * /api/vendors/from-place (POST API §61): saves the add form pre-filled from
 * Google. The place is checked with Google server-side (source GOOGLE_PLACES),
 * so it shares the place-details limit.
 */
export const POST = route({
  auth: "member",
  body: addVendorFromPlaceSchema,
  rateLimit: policies.vendorDiscoveryPlace,
  handler: async ({ ctx, body }) => created(await vendorsService.createFromPlace(ctx, body)),
});
