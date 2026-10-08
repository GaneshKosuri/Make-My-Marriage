/**
 * features/events — Event list, detail and forms (Phase 2).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["events"] as const;

/** TanStack Query keys. Invalidate `eventsKeys.all` after any mutation in this domain. */
export const eventsKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
};
