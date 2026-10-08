/**
 * features/weddings — Create-wedding and wedding-details forms (Phase 1).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["wedding"] as const;

/** TanStack Query keys. Invalidate `weddingsKeys.all` after any mutation in this domain. */
export const weddingsKeys = {
  all: ROOT,
  current: () => [...ROOT, "current"] as const,
};
