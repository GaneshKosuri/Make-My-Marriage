import type { Metadata } from "next";
import { Suspense } from "react";

import { ExpensesScreen, ExpensesSkeleton } from "@/features/expenses/components/expenses-screen";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Expenses" };

/**
 * /app/expenses (PRD §9.15): money spent or committed, by category — not a
 * budget. The screen reads its filters and `?new=1` from the address itself.
 */
export default function ExpensesPage() {
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <Expenses />
    </Suspense>
  );
}

async function Expenses() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return <ExpensesScreen today={dateOnlyInTimeZone(new Date(), current.wedding.timeZone)} />;
}
