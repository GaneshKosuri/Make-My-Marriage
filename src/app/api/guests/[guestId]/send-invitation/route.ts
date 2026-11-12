import { policies, route, success } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/** /api/guests/[guestId]/send-invitation (POST API §46). */

/** POST — API §46: emails the guest's invitation now (or again) and records when. */
export const POST = route({
  auth: "member",
  params: guestIdParams,
  rateLimit: policies.guestEmailSend,
  handler: async ({ ctx, params }) => {
    await guestsService.sendInvitation(ctx, params.guestId);
    return success();
  },
});
