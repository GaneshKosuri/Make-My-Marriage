import { ok, route } from "@/server/http";
import { gallerySettingsService } from "@/modules/weddings";

/** /api/gallery/qr (GET API §84, Option A): the link the browser draws the QR for. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await gallerySettingsService.getQr(ctx)),
});
