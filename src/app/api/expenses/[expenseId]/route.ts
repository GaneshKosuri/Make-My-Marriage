import { notImplemented, route } from "@/server/http";
import { expenseIdParams } from "@/modules/expenses/expense.schemas";

/**
 * /api/expenses/[expenseId] — stub (GET API §56, PATCH API §57, DELETE API §58).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 4: Financial & Vendors.
 */

/** GET — API §56. */
export const GET = route({
  auth: "member",
  params: expenseIdParams,
  // Phase 4: Financial & Vendors: ok(await expensesService.get(ctx, params.expenseId))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** PATCH — API §57. */
export const PATCH = route({
  auth: "member",
  params: expenseIdParams,
  // Phase 4: Financial & Vendors: ok(await expensesService.update(ctx, params.expenseId, body))
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});

/** DELETE — API §58. */
export const DELETE = route({
  auth: "member",
  params: expenseIdParams,
  // Phase 4: Financial & Vendors: await expensesService.delete(ctx, params.expenseId); return noContent()
  handler: () => notImplemented("Phase 4: Financial & Vendors"),
});
