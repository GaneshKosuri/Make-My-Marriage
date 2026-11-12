import { ok, route } from "@/server/http";
import { guestsService } from "@/modules/guests";

/** /api/guests/rsvp-summary (GET API §52): invitations by RSVP status and people coming. */

/** GET — API §52. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await guestsService.getRsvpSummary(ctx)),
});
