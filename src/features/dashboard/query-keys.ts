/**
 * features/dashboard — Dashboard cards and lists (Phase 1).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["dashboard"] as const;

/** TanStack Query keys. Invalidate `dashboardKeys.all` after any mutation in this domain. */
export const dashboardKeys = {
  all: ROOT,
  summary: () => [...ROOT, "summary"] as const,
};
