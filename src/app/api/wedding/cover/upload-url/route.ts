import { ok, route } from "@/server/http";
import { weddingsService } from "@/modules/weddings";
import { coverUploadRequestSchema } from "@/modules/weddings/wedding.schemas";

/**
 * /api/wedding/cover/upload-url (POST API §83): a signed PUT for a new cover
 * photo. Saving it is PATCH /api/wedding/website with `coverImageObjectKey`.
 * Limited per wedding in the service.
 */
export const POST = route({
  auth: "member",
  body: coverUploadRequestSchema,
  handler: async ({ ctx, body }) => ok(await weddingsService.requestCoverUploadUrl(ctx, body)),
});
