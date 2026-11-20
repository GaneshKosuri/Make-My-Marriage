import { ok, route } from "@/server/http";
import { gallerySettingsService } from "@/modules/weddings";
import { updateGallerySettingsSchema } from "@/modules/weddings/wedding.schemas";

/** /api/gallery/settings (GET API §73, PATCH API §74). */

/** GET — the gallery switches and the stable gallery link. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await gallerySettingsService.getSettings(ctx)),
});

/** PATCH — turn the gallery or guest uploads on or off. */
export const PATCH = route({
  auth: "member",
  body: updateGallerySettingsSchema,
  handler: async ({ ctx, body }) => ok(await gallerySettingsService.updateSettings(ctx, body)),
});
