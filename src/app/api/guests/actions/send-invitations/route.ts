import { ok, policies, route } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { sendInvitationsSchema } from "@/modules/guests/guest.schemas";

/** /api/guests/actions/send-invitations (POST API §47). */

/** POST — API §47: queues the emails and answers at once with the batch to follow. */
export const POST = route({
  auth: "member",
  body: sendInvitationsSchema,
  rateLimit: policies.guestEmailBulk,
  handler: async ({ ctx, body }) => ok(await guestsService.sendBulkInvitations(ctx, body)),
});
