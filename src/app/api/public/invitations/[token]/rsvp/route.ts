import { ok, route, tokenParams } from "@/server/http";
import { invitationService } from "@/modules/guests";
import { submitRsvpSchema } from "@/modules/guests/guest.schemas";

/** /api/public/invitations/[token]/rsvp (POST API §51). */

/**
 * POST — API §51. Rate limits are consumed inside the service, after the link
 * and party size are checked: per invitation first, then the shared ceiling.
 */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  body: submitRsvpSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await invitationService.submitRsvp(ctx, params.token, body)),
});
