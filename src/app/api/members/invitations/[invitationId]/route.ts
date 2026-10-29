import { route, success } from "@/server/http";
import { memberInvitationService } from "@/modules/members";
import { memberInvitationIdParams } from "@/modules/members/member.schemas";

/** /api/members/invitations/[invitationId] (DELETE API §24). Admin only. */

/** DELETE — revoke a pending invitation (status → REVOKED) (API §24). */
export const DELETE = route({
  auth: "admin",
  params: memberInvitationIdParams,
  handler: async ({ ctx, params }) => {
    await memberInvitationService.revoke(ctx, params.invitationId);
    return success();
  },
});
