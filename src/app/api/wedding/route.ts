import { created, ok, route } from "@/server/http";
import { weddingsService } from "@/modules/weddings";
import { createWeddingSchema, updateWeddingSchema } from "@/modules/weddings/wedding.schemas";

/** /api/wedding (GET API §18, POST API §17, PATCH API §19). */

/** GET — the caller's wedding (API §18). */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await weddingsService.getWedding(ctx)),
});

/** POST — create the wedding; the caller becomes its first Admin (API §17). */
export const POST = route({
  auth: "user",
  body: createWeddingSchema,
  handler: async ({ ctx, body }) => created(await weddingsService.createWedding(ctx, body)),
});

/** PATCH — edit the wedding details; Admins and Managers; the slug never changes (API §19). */
export const PATCH = route({
  auth: "member",
  body: updateWeddingSchema,
  handler: async ({ ctx, body }) => ok(await weddingsService.updateWedding(ctx, body)),
});
