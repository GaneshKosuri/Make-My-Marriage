import { ok, policies, route, tokenParams } from "@/server/http";
import { invitationService } from "@/modules/guests";

/** /api/public/invitations/[token] (GET API §50). */

/** GET — API §50: what /invite/[token] shows; unusable links are NOT_FOUND. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  rateLimit: policies.publicInvitationView,
  handler: async ({ ctx, params }) =>
    ok(await invitationService.getPublicInvitation(ctx, params.token)),
});
