import { notImplemented, route } from "@/server/http";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/**
 * /api/guests/[guestId]/invitation-link — stub (GET API §45).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §45. */
export const GET = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: ok(await guestsService.getInvitationLink(ctx, params.guestId))
  handler: () => notImplemented("Phase 3: Guests"),
});
