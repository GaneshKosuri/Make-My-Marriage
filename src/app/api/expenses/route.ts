import { created, paginated, route } from "@/server/http";
import { expensesService } from "@/modules/expenses";
import { createExpenseSchema, listExpensesQuerySchema } from "@/modules/expenses/expense.schemas";

/** /api/expenses (GET API §53, POST API §54). */

/** GET — API §53: newest first, with category, event, vendor and date filters. */
export const GET = route({
  auth: "member",
  query: listExpensesQuerySchema,
  handler: async ({ ctx, query }) => {
    const { items, pagination } = await expensesService.list(ctx, query);
    return paginated(items, pagination);
  },
});

/** POST — API §54: the member who adds it is recorded from the session. */
export const POST = route({
  auth: "member",
  body: createExpenseSchema,
  handler: async ({ ctx, body }) => created(await expensesService.create(ctx, body)),
});
