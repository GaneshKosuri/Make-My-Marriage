import { ok, route } from "@/server/http";
import { livestreamService } from "@/modules/weddings";
import { updateLivestreamSchema } from "@/modules/weddings/wedding.schemas";

/** /api/wedding/livestream (GET API §70, PATCH API §71–72). */

/** GET — the YouTube link, the switch and the player link. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await livestreamService.getSettings(ctx)),
});

/** PATCH — add, change or remove the link (`null` removes it) and switch it on or off. */
export const PATCH = route({
  auth: "member",
  body: updateLivestreamSchema,
  handler: async ({ ctx, body }) => ok(await livestreamService.updateSettings(ctx, body)),
});
