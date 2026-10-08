import { notImplemented, route } from "@/server/http";

/**
 * /api/events — stub (GET API §29, POST API §30).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 2: Planning.
 */

/** GET — API §29. */
export const GET = route({
  auth: "member",
  // Phase 2: Planning: ok(await eventsService.list(ctx, query))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** POST — API §30. */
export const POST = route({
  auth: "member",
  // Phase 2: Planning: created(await eventsService.create(ctx, body))
  handler: () => notImplemented("Phase 2: Planning"),
});
