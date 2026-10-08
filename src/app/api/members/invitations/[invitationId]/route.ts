import { notImplemented, route } from "@/server/http";
import { memberInvitationIdParams } from "@/modules/members/member.schemas";

/**
 * /api/members/invitations/[invitationId] — stub (DELETE API §24).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** DELETE — API §24. */
export const DELETE = route({
  auth: "admin",
  params: memberInvitationIdParams,
  // Phase 1: Foundation: await memberInvitationService.revoke(ctx, params.invitationId); return success()
  handler: () => notImplemented("Phase 1: Foundation"),
});
