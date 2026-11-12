import { ok, route } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/** /api/guests/[guestId]/invitation-link (GET API §45). */

/** GET — API §45: the guest's stable invitation URL, for copying and sharing. */
export const GET = route({
  auth: "member",
  params: guestIdParams,
  handler: async ({ ctx, params }) =>
    ok(await guestsService.getInvitationLink(ctx, params.guestId)),
});
