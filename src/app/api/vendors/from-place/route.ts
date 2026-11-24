import { created, route } from "@/server/http";
import { vendorsService } from "@/modules/vendors";
import { addVendorFromPlaceSchema } from "@/modules/vendors/vendor.schemas";

/**
 * /api/vendors/from-place (POST API §61): saves the add form pre-filled from
 * Google. The place is checked with Google server-side (source GOOGLE_PLACES);
 * the service charges the place-details limit only when it asks Google, so a
 * duplicate or a bad event doesn't use it up (QA CL).
 */
export const POST = route({
  auth: "member",
  body: addVendorFromPlaceSchema,
  handler: async ({ ctx, body }) => created(await vendorsService.createFromPlace(ctx, body)),
});
