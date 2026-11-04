import { created, ok, route } from "@/server/http";
import { eventsService } from "@/modules/events";
import { createEventSchema, listEventsQuerySchema } from "@/modules/events/event.schemas";

/** /api/events (GET API §29, POST API §30). */

/** GET — API §29. */
export const GET = route({
  auth: "member",
  query: listEventsQuerySchema,
  handler: async ({ ctx, query }) => ok(await eventsService.list(ctx, query)),
});

/** POST — API §30. */
export const POST = route({
  auth: "member",
  body: createEventSchema,
  handler: async ({ ctx, body }) => created(await eventsService.create(ctx, body)),
});
