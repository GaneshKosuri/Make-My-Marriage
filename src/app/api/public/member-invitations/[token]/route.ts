import { ok, policies, route, tokenParams } from "@/server/http";
import { memberInvitationService } from "@/modules/members";

/** /api/public/member-invitations/[token] (GET API §25). */

/** GET — what /join/[token] shows; unusable links are NOT_FOUND (API §25). */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  rateLimit: policies.publicMemberInvitationView,
  handler: async ({ ctx, params }) =>
    ok(await memberInvitationService.getPublicInvitation(ctx, params.token)),
});
