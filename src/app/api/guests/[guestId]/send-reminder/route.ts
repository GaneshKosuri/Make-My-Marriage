import { notImplemented, route } from "@/server/http";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/**
 * /api/guests/[guestId]/send-reminder — stub (POST API §48).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** POST — API §48. */
export const POST = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: await guestsService.sendReminder(ctx, params.guestId); return success()
  handler: () => notImplemented("Phase 3: Guests"),
});
