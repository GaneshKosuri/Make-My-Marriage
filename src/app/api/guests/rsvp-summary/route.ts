import { notImplemented, route } from "@/server/http";

/**
 * /api/guests/rsvp-summary — stub (GET API §52).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §52. */
export const GET = route({
  auth: "member",
  // Phase 3: Guests: ok(await guestsService.getRsvpSummary(ctx))
  handler: () => notImplemented("Phase 3: Guests"),
});
