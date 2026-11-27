"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { useAppMutation } from "@/lib/use-app-mutation";
import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { ExpenseCategory } from "@/modules/expenses/expense.constants";
import type { ExpenseDto, ExpenseSummaryDto } from "@/modules/expenses/expense.types";

import type { CreateExpenseBody, UpdateExpenseBody } from "./expense-form";
import { expensesKeys } from "./query-keys";

/** TanStack Query hooks over the Expenses REST API (API_DESIGN §53–58). */

export interface ExpensesQuery {
  page?: number;
  limit?: number;
  category?: ExpenseCategory;
  eventId?: string;
  vendorId?: string;
  from?: string;
  to?: string;
}

const expensePath = (expenseId: string) => `/api/expenses/${encodeURIComponent(expenseId)}`;

/** GET /api/expenses (API §53): newest first. The last page stays on screen while the next loads. */
export function useExpenses(query: ExpensesQuery) {
  return useQuery({
    queryKey: expensesKeys.list({ ...query }),
    queryFn: ({ signal }) =>
      apiFetchPage<ExpenseDto>("/api/expenses", { query: { ...query }, signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/expenses/summary (API §55): the total and the amount per category. */
export function useExpenseSummary() {
  return useQuery({
    queryKey: expensesKeys.summary(),
    queryFn: ({ signal }) => apiFetch<ExpenseSummaryDto>("/api/expenses/summary", { signal }),
  });
}

/** Lists, the summary and the dashboard's expense total change together. */
function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: expensesKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
    [queryClient],
  );
}

/** POST /api/expenses (API §54). */
export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useAppMutation({
    mutationFn: (body: CreateExpenseBody) =>
      apiFetch<ExpenseDto>("/api/expenses", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/expenses/:id (API §57): changed fields plus the version they were read at. */
export function useUpdateExpense() {
  const invalidate = useInvalidateExpenses();
  return useAppMutation({
    mutationFn: ({ expenseId, body }: { expenseId: string; body: UpdateExpenseBody }) =>
      apiFetch<ExpenseDto>(expensePath(expenseId), { method: "PATCH", body }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/expenses/:id (API §58): permanent. */
export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses();
  return useAppMutation({
    mutationFn: (expenseId: string) => apiAction(expensePath(expenseId), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/**
 * The latest copy of one expense, e.g. to reload an edit form after a
 * CONFLICT. Lists are refreshed too.
 */
export function useReloadExpense() {
  const queryClient = useQueryClient();
  return async (expenseId: string) => {
    const expense = await queryClient.fetchQuery({
      queryKey: expensesKeys.detail(expenseId),
      queryFn: ({ signal }) => apiFetch<ExpenseDto>(expensePath(expenseId), { signal }),
      staleTime: 0,
    });
    void queryClient.invalidateQueries({ queryKey: expensesKeys.all });
    return expense;
  };
}
