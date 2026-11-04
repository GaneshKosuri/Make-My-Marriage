import { ok, route, success } from "@/server/http";
import { eventsService } from "@/modules/events";
import { eventIdParams, updateEventSchema } from "@/modules/events/event.schemas";

/** /api/events/[eventId] (GET API §31, PATCH API §32, DELETE API §33). */

/** GET — API §31. */
export const GET = route({
  auth: "member",
  params: eventIdParams,
  handler: async ({ ctx, params }) => ok(await eventsService.get(ctx, params.eventId)),
});

/** PATCH — API §32. */
export const PATCH = route({
  auth: "member",
  params: eventIdParams,
  body: updateEventSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await eventsService.update(ctx, params.eventId, body)),
});

/** DELETE — API §33: archives the event. */
export const DELETE = route({
  auth: "member",
  params: eventIdParams,
  handler: async ({ ctx, params }) => {
    await eventsService.archive(ctx, params.eventId);
    return success();
  },
});
