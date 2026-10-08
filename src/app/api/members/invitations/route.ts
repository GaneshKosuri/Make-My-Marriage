import { notImplemented, route } from "@/server/http";

/**
 * /api/members/invitations — stub (GET API §23, POST API §22).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §23. */
export const GET = route({
  auth: "admin",
  // Phase 1: Foundation: ok(await memberInvitationService.listPending(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});

/** POST — API §22. */
export const POST = route({
  auth: "admin",
  // Phase 1: Foundation: created(await memberInvitationService.invite(ctx, body))
  handler: () => notImplemented("Phase 1: Foundation"),
});
