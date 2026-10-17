import { notImplemented, created, route } from "@/server/http";
import { weddingsService } from "@/modules/weddings";
import { createWeddingSchema } from "@/modules/weddings/wedding.schemas";

/**
 * /api/wedding (GET API §18, POST API §17, PATCH API §19).
 * GET and PATCH arrive with the dashboard and wedding settings (Phase 1: Foundation).
 */

/** GET — API §18. */
export const GET = route({
  auth: "member",
  // Phase 1: Foundation: ok(await weddingsService.getWedding(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});

/** POST — create the wedding; the caller becomes its first Admin (API §17). */
export const POST = route({
  auth: "user",
  body: createWeddingSchema,
  handler: async ({ ctx, body }) => created(await weddingsService.createWedding(ctx, body)),
});

/** PATCH — API §19. */
export const PATCH = route({
  auth: "member",
  // Phase 1: Foundation: ok(await weddingsService.updateWedding(ctx, body))
  handler: () => notImplemented("Phase 1: Foundation"),
});
