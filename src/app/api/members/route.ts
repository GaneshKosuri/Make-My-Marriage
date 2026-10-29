import { ok, route } from "@/server/http";
import { membersService } from "@/modules/members";

/** /api/members (GET API §21). */

/** GET — the wedding's members; Admins and Managers (API §21). */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await membersService.listMembers(ctx)),
});
