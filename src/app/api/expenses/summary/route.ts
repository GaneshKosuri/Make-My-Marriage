import { ok, route } from "@/server/http";
import { expensesService } from "@/modules/expenses";

/** /api/expenses/summary (GET API §55). */

/** GET — API §55: the total and the amount per category. No budget maths. */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await expensesService.getSummary(ctx)),
});
