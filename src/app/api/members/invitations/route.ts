import { created, ok, policies, route } from "@/server/http";
import { memberInvitationService } from "@/modules/members";
import { inviteMemberSchema } from "@/modules/members/member.schemas";

/** /api/members/invitations (GET API §23, POST API §22). Admin only. */

/** GET — pending, unexpired invitations (API §23). */
export const GET = route({
  auth: "admin",
  handler: async ({ ctx }) => ok(await memberInvitationService.listPending(ctx)),
});

/** POST — invite someone by email; the email is sent before the response (API §22). */
export const POST = route({
  auth: "admin",
  body: inviteMemberSchema,
  rateLimit: policies.memberInvite,
  handler: async ({ ctx, body }) => created(await memberInvitationService.invite(ctx, body)),
});
