import { ok, route, success } from "@/server/http";
import { membersService } from "@/modules/members";
import { changeMemberRoleSchema, membershipIdParams } from "@/modules/members/member.schemas";

/** /api/members/[membershipId] (PATCH API §27, DELETE API §28). Admin only. */

/** PATCH — change a member's role; the wedding keeps at least one Admin (API §27). */
export const PATCH = route({
  auth: "admin",
  params: membershipIdParams,
  body: changeMemberRoleSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await membersService.changeRole(ctx, params.membershipId, body)),
});

/** DELETE — remove a member; their access ends at once (API §28). */
export const DELETE = route({
  auth: "admin",
  params: membershipIdParams,
  handler: async ({ ctx, params }) => {
    await membersService.removeMember(ctx, params.membershipId);
    return success();
  },
});
