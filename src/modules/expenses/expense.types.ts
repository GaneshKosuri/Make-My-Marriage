/**
 * Expense DTOs and inputs (API_DESIGN §53–58). Isomorphic. Money is integer paise.
 * TODO(Phase 4): derive inputs from ./expense.schemas.ts with z.infer.
 */
import type { PageQuery } from "@/lib/pagination";

import type { ExpenseCategory, ExpenseCurrency } from "./expense.constants";

export interface ExpenseDto {
  id: string;
  title: string;
  amountPaise: number;
  currency: ExpenseCurrency;
  /** YYYY-MM-DD */
  expenseDate: string;
  category: ExpenseCategory;
  event: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListExpensesQuery extends PageQuery {
  category?: ExpenseCategory;
  eventId?: string;
  vendorId?: string;
  from?: string;
  to?: string;
}

export interface CreateExpenseInput {
  title: string;
  amountPaise: number;
  currency?: ExpenseCurrency;
  expenseDate: string;
  category: ExpenseCategory;
  eventId?: string | null;
  vendorId?: string | null;
  notes?: string | null;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

/** GET /api/expenses/summary (API_DESIGN §55). */
export interface ExpenseSummaryDto {
  totalExpensePaise: number;
  currency: ExpenseCurrency;
  byCategory: { category: ExpenseCategory; amountPaise: number }[];
}
