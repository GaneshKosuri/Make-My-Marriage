import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <PagePlaceholder
      title="Expenses"
      phase="Phase 4: Financial & Vendors"
      description="Money spent or committed, by category — not a budget (PRD §9.15)."
    />
  );
}
