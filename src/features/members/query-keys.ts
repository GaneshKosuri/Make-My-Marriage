/**
 * features/members — Wedding Members management, ADMIN only (Phase 1).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["members"] as const;

/** TanStack Query keys. Invalidate `membersKeys.all` after any mutation in this domain. */
export const membersKeys = {
  all: ROOT,
  list: () => [...ROOT, "list"] as const,
  invitations: () => [...ROOT, "invitations"] as const,
};
