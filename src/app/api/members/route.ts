import { notImplemented, route } from "@/server/http";

/**
 * /api/members — stub (GET API §21).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §21. */
export const GET = route({
  auth: "member",
  // Phase 1: Foundation: ok(await membersService.listMembers(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});
