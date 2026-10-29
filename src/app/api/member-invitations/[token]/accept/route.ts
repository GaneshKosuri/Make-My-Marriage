import { ok, policies, route, tokenParams } from "@/server/http";
import { memberInvitationService } from "@/modules/members";

/** /api/member-invitations/[token]/accept (POST API §26). */

/** POST — the signed-in invitee joins the wedding (API §26). */
export const POST = route({
  auth: "user",
  params: tokenParams,
  invalidParams: "INVALID_TOKEN",
  rateLimit: policies.memberInvitationAccept,
  handler: async ({ ctx, params }) => ok(await memberInvitationService.accept(ctx, params.token)),
});
