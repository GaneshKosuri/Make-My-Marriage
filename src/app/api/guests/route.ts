import { notImplemented, route } from "@/server/http";

/**
 * /api/guests — stub (GET API §39, POST API §40).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §39. */
export const GET = route({
  auth: "member",
  // Phase 3: Guests: paginated(...(await guestsService.list(ctx, query)))
  handler: () => notImplemented("Phase 3: Guests"),
});

/** POST — API §40. */
export const POST = route({
  auth: "member",
  // Phase 3: Guests: created(await guestsService.create(ctx, body))
  handler: () => notImplemented("Phase 3: Guests"),
});
