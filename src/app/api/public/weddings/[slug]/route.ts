import { ok, policies, route } from "@/server/http";
import { websiteService } from "@/modules/weddings";
import { weddingSlugParams } from "@/modules/weddings/wedding.schemas";

/**
 * /api/public/weddings/:slug (GET API §69): the published website's content.
 * Unpublished, deleted and unknown weddings are all 404.
 */
export const GET = route({
  auth: "public",
  params: weddingSlugParams,
  invalidParams: "NOT_FOUND",
  rateLimit: policies.publicWebsiteView,
  handler: async ({ ctx, params }) => ok(await websiteService.getPublicWebsite(ctx, params.slug)),
});
