import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/member-invitations/[token]/accept — stub (POST API §26).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** POST — API §26. */
export const POST = route({
  auth: "user",
  params: tokenParams,
  invalidParams: "INVALID_TOKEN",
  // Phase 1: Foundation: ok(await memberInvitationService.accept(ctx, params.token))
  handler: () => notImplemented("Phase 1: Foundation"),
});
