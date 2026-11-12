import { ok, route, success } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { guestIdParams, updateGuestSchema } from "@/modules/guests/guest.schemas";

/** /api/guests/[guestId] (GET API §41, PATCH API §42, DELETE API §43). */

/** GET — API §41. */
export const GET = route({
  auth: "member",
  params: guestIdParams,
  handler: async ({ ctx, params }) => ok(await guestsService.get(ctx, params.guestId)),
});

/** PATCH — API §42: partial, with the version last read. */
export const PATCH = route({
  auth: "member",
  params: guestIdParams,
  body: updateGuestSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await guestsService.update(ctx, params.guestId, body)),
});

/** DELETE — API §43: hard delete; pending emails to the guest are cancelled. */
export const DELETE = route({
  auth: "member",
  params: guestIdParams,
  handler: async ({ ctx, params }) => {
    await guestsService.delete(ctx, params.guestId);
    return success();
  },
});
