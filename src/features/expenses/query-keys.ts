/**
 * features/expenses — Expense tracker and summary (Phase 4).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["expenses"] as const;

/** TanStack Query keys. Invalidate `expensesKeys.all` after any mutation in this domain. */
export const expensesKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
  summary: () => [...ROOT, "summary"] as const,
};
