/**
 * Expense DTOs and inputs (API_DESIGN §53–58). Isomorphic. Money is integer paise.
 */
import type { z } from "zod";

import type { EventSummaryDto } from "@/modules/events/event.types";
import type { VendorSummaryDto } from "@/modules/vendors/vendor.types";

import type { ExpenseCategory, ExpenseCurrency } from "./expense.constants";
import type {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expense.schemas";

export interface ExpenseDto {
  id: string;
  title: string;
  amountPaise: number;
  currency: ExpenseCurrency;
  /** YYYY-MM-DD */
  expenseDate: string;
  category: ExpenseCategory;
  /** The linked event, archived ones included. */
  event: EventSummaryDto | null;
  /** The linked vendor, archived ones included. */
  vendor: VendorSummaryDto | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ListExpensesQuery = z.output<typeof listExpensesQuerySchema>;
export type CreateExpenseInput = z.output<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.output<typeof updateExpenseSchema>;

/** GET /api/expenses/summary (API_DESIGN §55). */
export interface ExpenseSummaryDto {
  totalExpensePaise: number;
  currency: ExpenseCurrency;
  byCategory: { category: ExpenseCategory; amountPaise: number }[];
}
