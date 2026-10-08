import { notImplemented, route } from "@/server/http";
import { membershipIdParams } from "@/modules/members/member.schemas";

/**
 * /api/members/[membershipId] — stub (PATCH API §27, DELETE API §28).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** PATCH — API §27. */
export const PATCH = route({
  auth: "admin",
  params: membershipIdParams,
  // Phase 1: Foundation: ok(await membersService.changeRole(ctx, params.membershipId, body))
  handler: () => notImplemented("Phase 1: Foundation"),
});

/** DELETE — API §28. */
export const DELETE = route({
  auth: "admin",
  params: membershipIdParams,
  // Phase 1: Foundation: await membersService.removeMember(ctx, params.membershipId); return success()
  handler: () => notImplemented("Phase 1: Foundation"),
});
