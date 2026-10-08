/** Expense request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const expenseIdParams = z.object({ expenseId: objectId }).strict();

/*
 * TODO(Phase 4: Financial & Vendors) — define with `.strict()`:
 *   - listExpensesQuerySchema  API_DESIGN §53  pageQuerySchema + category, eventId, vendorId, from, to
 *   - createExpenseSchema      API_DESIGN §54  amountPaise positive integer, currency "INR",
 *                                              expenseDate YYYY-MM-DD, category enum, optional event/vendor
 *   - updateExpenseSchema      API_DESIGN §57  partial
 */
