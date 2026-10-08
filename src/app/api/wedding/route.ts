import { notImplemented, route } from "@/server/http";

/**
 * /api/wedding — stub (GET API §18, POST API §17, PATCH API §19).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §18. */
export const GET = route({
  auth: "member",
  // Phase 1: Foundation: ok(await weddingsService.getWedding(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});

/** POST — API §17. */
export const POST = route({
  auth: "user",
  // Phase 1: Foundation: created(await weddingsService.createWedding(ctx, body))
  handler: () => notImplemented("Phase 1: Foundation"),
});

/** PATCH — API §19. */
export const PATCH = route({
  auth: "member",
  // Phase 1: Foundation: ok(await weddingsService.updateWedding(ctx, body))
  handler: () => notImplemented("Phase 1: Foundation"),
});
