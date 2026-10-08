import { notImplemented, route } from "@/server/http";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/**
 * /api/guests/[guestId]/send-invitation — stub (POST API §46).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** POST — API §46. */
export const POST = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: await guestsService.sendInvitation(ctx, params.guestId); return success()
  handler: () => notImplemented("Phase 3: Guests"),
});
