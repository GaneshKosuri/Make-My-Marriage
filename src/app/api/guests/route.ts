import { created, paginated, route } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { createGuestSchema, listGuestsQuerySchema } from "@/modules/guests/guest.schemas";

/** /api/guests (GET API §39, POST API §40). */

/** GET — API §39: page, search and filters. */
export const GET = route({
  auth: "member",
  query: listGuestsQuerySchema,
  handler: async ({ ctx, query }) => {
    const { items, pagination } = await guestsService.list(ctx, query);
    return paginated(items, pagination);
  },
});

/** POST — API §40. */
export const POST = route({
  auth: "member",
  body: createGuestSchema,
  handler: async ({ ctx, body }) => created(await guestsService.create(ctx, body)),
});
