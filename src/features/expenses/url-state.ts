/**
 * Reads /app/expenses search params into filters, ignoring anything unexpected
 * (a stale or hand-edited link just shows every expense).
 */
import { isValidDateOnly } from "@/lib/dates";
import { OBJECT_ID_PATTERN } from "@/lib/object-id";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/modules/expenses/expense.constants";

import { EXPENSES_PARAMS } from "./expenses-content";

type SearchParams = Record<string, string | string[] | undefined>;

export interface ExpenseFilters {
  category?: ExpenseCategory;
  eventId?: string;
  vendorId?: string;
  /** Calendar days ("2026-09-01"), both included; only as a pair. */
  from?: string;
  to?: string;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const id = (value: string | undefined) =>
  value && OBJECT_ID_PATTERN.test(value) ? value : undefined;
const day = (value: string | undefined) => (value && isValidDateOnly(value) ? value : undefined);

export function readExpensesUrl(params: SearchParams): {
  filters: ExpenseFilters;
  startAdding: boolean;
} {
  const category = first(params[EXPENSES_PARAMS.category]);
  const from = day(first(params[EXPENSES_PARAMS.from]));
  const to = day(first(params[EXPENSES_PARAMS.to]));
  const range = from && to && from <= to;
  const filters: ExpenseFilters = {
    category: EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
      ? (category as ExpenseCategory)
      : undefined,
    eventId: id(first(params[EXPENSES_PARAMS.eventId])),
    vendorId: id(first(params[EXPENSES_PARAMS.vendorId])),
    from: range ? from : undefined,
    to: range ? to : undefined,
  };
  for (const key of Object.keys(filters) as (keyof ExpenseFilters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  return { filters, startAdding: first(params[EXPENSES_PARAMS.add]) === "1" };
}

/** The address for these filters, so the list can be shared or reloaded. */
export function expensesUrlFor(list: string, filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${list}?${search}` : list;
}
