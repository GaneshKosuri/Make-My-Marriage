import { notImplemented, route } from "@/server/http";

/**
 * /api/expenses/summary — stub (GET API §55).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §55. */
export const GET = route({
  auth: "member",
  // Phase 4: Financial & Vendors: ok(await expensesService.getSummary(ctx))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
