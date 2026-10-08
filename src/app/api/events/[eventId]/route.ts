import { notImplemented, route } from "@/server/http";
import { eventIdParams } from "@/modules/events/event.schemas";

/**
 * /api/events/[eventId] — stub (GET API §31, PATCH API §32, DELETE API §33).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 2: Planning.
 */

/** GET — API §31. */
export const GET = route({
  auth: "member",
  params: eventIdParams,
  // Phase 2: Planning: ok(await eventsService.get(ctx, params.eventId))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** PATCH — API §32. */
export const PATCH = route({
  auth: "member",
  params: eventIdParams,
  // Phase 2: Planning: ok(await eventsService.update(ctx, params.eventId, body))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** DELETE — API §33. */
export const DELETE = route({
  auth: "member",
  params: eventIdParams,
  // Phase 2: Planning: await eventsService.archive(ctx, params.eventId); return success()
  handler: () => notImplemented("Phase 2: Planning"),
});
