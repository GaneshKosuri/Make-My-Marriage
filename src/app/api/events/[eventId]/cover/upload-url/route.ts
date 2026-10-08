import { notImplemented, route } from "@/server/http";
import { eventIdParams } from "@/modules/events/event.schemas";

/**
 * /api/events/[eventId]/cover/upload-url — stub (POST API §83).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 5: Wedding Experience.
 */

/** POST — API §83. */
export const POST = route({
  auth: "member",
  params: eventIdParams,
  // Phase 5: Wedding Experience: ok(await eventsService.requestCoverUploadUrl(ctx, params.eventId, body))
  handler: () => notImplemented("Phase 5: Wedding Experience"),
});
