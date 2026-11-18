import { ok, route, success } from "@/server/http";
import { expensesService } from "@/modules/expenses";
import { expenseIdParams, updateExpenseSchema } from "@/modules/expenses/expense.schemas";

/** /api/expenses/[expenseId] (GET API §56, PATCH API §57, DELETE API §58). */

/** GET — API §56. */
export const GET = route({
  auth: "member",
  params: expenseIdParams,
  handler: async ({ ctx, params }) => ok(await expensesService.get(ctx, params.expenseId)),
});

/** PATCH — API §57: partial, with the version last read. */
export const PATCH = route({
  auth: "member",
  params: expenseIdParams,
  body: updateExpenseSchema,
  handler: async ({ ctx, params, body }) =>
    ok(await expensesService.update(ctx, params.expenseId, body)),
});

/** DELETE — API §58: hard delete. */
export const DELETE = route({
  auth: "member",
  params: expenseIdParams,
  handler: async ({ ctx, params }) => {
    await expensesService.delete(ctx, params.expenseId);
    return success();
  },
});
