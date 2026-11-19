import { ok, route, success } from "@/server/http";
import { vendorsService } from "@/modules/vendors";
import { updateVendorSchema, vendorIdParams } from "@/modules/vendors/vendor.schemas";

/** /api/vendors/[vendorId] (GET API §62, PATCH API §63, DELETE API §64). */

/** GET — API §62: archived vendors stay readable. */
export const GET = route({
  auth: "member",
  params: vendorIdParams,
  handler: async ({ ctx, params }) => ok(await vendorsService.get(ctx, params.vendorId)),
});

/** PATCH — API §63: partial, with the version last read. */
export const PATCH = route({
  auth: "member",
  params: vendorIdParams,
  body: updateVendorSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await vendorsService.update(ctx, params.vendorId, body)),
});

/** DELETE — API §64: archives (expenses keep the link); never hard-deletes. */
export const DELETE = route({
  auth: "member",
  params: vendorIdParams,
  handler: async ({ ctx, params }) => {
    await vendorsService.archive(ctx, params.vendorId);
    return success();
  },
});
