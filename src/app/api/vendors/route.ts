import { created, paginated, route } from "@/server/http";
import { vendorsService } from "@/modules/vendors";
import { createVendorSchema, listVendorsQuerySchema } from "@/modules/vendors/vendor.schemas";

/** /api/vendors (GET API §59, POST API §60). */

/** GET — API §59: page, category, search and archived vendors on request. */
export const GET = route({
  auth: "member",
  query: listVendorsQuerySchema,
  handler: async ({ ctx, query }) => {
    const { items, pagination } = await vendorsService.list(ctx, query);
    return paginated(items, pagination);
  },
});

/** POST — API §60: a vendor entered by hand (source MANUAL). */
export const POST = route({
  auth: "member",
  body: createVendorSchema,
  handler: async ({ ctx, body }) => created(await vendorsService.create(ctx, body)),
});
