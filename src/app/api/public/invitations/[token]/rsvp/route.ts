import { notImplemented, route, tokenParams } from "@/server/http";

/**
 * /api/public/invitations/[token]/rsvp — stub (POST API §51).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** POST — API §51. */
export const POST = route({
  auth: "public",
  params: tokenParams,
  invalidParams: "NOT_FOUND",
  // Phase 3: Guests: rate limits are consumed by invitationService.submitRsvp AFTER token + capacity validation: policies.rsvpPerInvitation, then policies.rsvpGlobal (API §51)
  // Phase 3: Guests: ok(await invitationService.submitRsvp(ctx, params.token, body))
  handler: () => notImplemented("Phase 3: Guests"),
});
