import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/member-invitations/[token] — stub (GET API §25).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §25. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 1: Foundation: ok(await memberInvitationService.getPublicInvitation(ctx, params.token))
  handler: () => notImplemented("Phase 1: Foundation"),
});
