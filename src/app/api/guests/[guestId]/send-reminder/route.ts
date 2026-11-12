import { policies, route, success } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/** /api/guests/[guestId]/send-reminder (POST API §48). */

/** POST — API §48: emails an RSVP reminder now to a guest still awaiting a reply. */
export const POST = route({
  auth: "member",
  params: guestIdParams,
  rateLimit: policies.guestEmailSend,
  handler: async ({ ctx, params }) => {
    await guestsService.sendReminder(ctx, params.guestId);
    return success();
  },
});
