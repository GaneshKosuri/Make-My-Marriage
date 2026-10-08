import { notImplemented, route } from "@/server/http";

/**
 * /api/expenses — stub (GET API §53, POST API §54).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §53. */
export const GET = route({
  auth: "member",
  // Phase 4: Financial & Vendors: paginated(...(await expensesService.list(ctx, query)))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** POST — API §54. */
export const POST = route({
  auth: "member",
  // Phase 4: Financial & Vendors: created(await expensesService.create(ctx, body))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
