import { ok, route } from "@/server/http";
import { photosService } from "@/modules/photos";
import { photoUploadRequestSchema } from "@/modules/photos/photo.schemas";

/**
 * /api/photos/upload-url (POST API §76): a signed PUT for one photo (and its
 * preview). The service checks the event first and only then uses the member's
 * and the wedding's upload quota (2026-09-18 notes), so the route sets no limit.
 */
export const POST = route({
  auth: "member",
  body: photoUploadRequestSchema,
  handler: async ({ ctx, body }) => ok(await photosService.requestUploadUrl(ctx, body)),
});
