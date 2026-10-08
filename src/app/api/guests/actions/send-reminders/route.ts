import { notImplemented, route } from "@/server/http";

/**
 * /api/guests/actions/send-reminders — stub (POST API §49).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** POST — API §49. */
export const POST = route({
  auth: "member",
  // Phase 3: Guests: ok(await guestsService.sendBulkReminders(ctx, body))
  handler: () => notImplemented("Phase 3: Guests"),
});
