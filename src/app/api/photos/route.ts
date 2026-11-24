import { created, cursorPaginated, route } from "@/server/http";
import { photosService } from "@/modules/photos";
import { confirmPhotoUploadSchema, listPhotosQuerySchema } from "@/modules/photos/photo.schemas";

/** /api/photos (GET API §75, POST API §77 + 2026-09-18 notes). */

/** GET — API §75: READY photos newest first, by album (`eventId`, `other`), cursor pages. */
export const GET = route({
  auth: "member",
  query: listPhotosQuerySchema,
  handler: async ({ ctx, query }) => {
    const { items, pagination } = await photosService.list(ctx, query);
    return cursorPaginated(items, pagination);
  },
});

/** POST — API §77: confirm a direct upload; verified, then published. Idempotent. */
export const POST = route({
  auth: "member",
  body: confirmPhotoUploadSchema,
  handler: async ({ ctx, body }) => created(await photosService.confirmUpload(ctx, body)),
});
