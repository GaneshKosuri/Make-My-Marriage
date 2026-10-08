/**
 * features/auth — Authentication UI: login/signup/forgot/reset forms (Phase 1).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["auth"] as const;

/** TanStack Query keys. Invalidate `authKeys.all` after any mutation in this domain. */
export const authKeys = {
  all: ROOT,
  me: () => [...ROOT, "me"] as const,
};
