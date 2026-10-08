import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/invitations/[token] — stub (GET API §50).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §50. */
export const GET = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 3: Guests: rateLimit: policies.publicInvitationView
  // Phase 3: Guests: ok(await invitationService.getPublicInvitation(ctx, params.token))
  handler: () => notImplemented("Phase 3: Guests"),
});
