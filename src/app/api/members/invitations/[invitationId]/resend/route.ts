import { ok, policies, route } from "@/server/http";
import { memberInvitationService } from "@/modules/members";
import { memberInvitationIdParams } from "@/modules/members/member.schemas";

/** /api/members/invitations/[invitationId]/resend (POST, decided 2026-10-29). Admin only. */

/** POST — email a fresh link for a pending invitation; the old link works until it is sent. */
export const POST = route({
  auth: "admin",
  params: memberInvitationIdParams,
  rateLimit: policies.memberInvite,
  handler: async ({ ctx, params }) =>
    ok(await memberInvitationService.resend(ctx, params.invitationId)),
});
