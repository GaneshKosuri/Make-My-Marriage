/**
 * features/website — Wedding website settings and theme picker (Phase 5).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["website"] as const;

/** TanStack Query keys. Invalidate `websiteKeys.all` after any mutation in this domain. */
export const websiteKeys = {
  all: ROOT,
  settings: () => [...ROOT, "settings"] as const,
};
