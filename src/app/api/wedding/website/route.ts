import { ok, route } from "@/server/http";
import { websiteService } from "@/modules/weddings";
import { updateWebsiteSettingsSchema } from "@/modules/weddings/wedding.schemas";

/** /api/wedding/website (GET API §67, PATCH API §68). */

/** GET — theme, welcome message, publish flag, gallery button and the address. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await websiteService.getSettings(ctx)),
});

/** PATCH — change any of them; the address never changes. */
export const PATCH = route({
  auth: "member",
  body: updateWebsiteSettingsSchema,
  handler: async ({ ctx, body }) => ok(await websiteService.updateSettings(ctx, body)),
});
