/**
 * features/guests — Guest list, RSVP summary, invitation sharing (Phase 3).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["guests"] as const;

/** TanStack Query keys. Invalidate `guestsKeys.all` after any mutation in this domain. */
export const guestsKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
  rsvpSummary: () => [...ROOT, "rsvpSummary"] as const,
  invitationLink: (id: string) => [...ROOT, "invitationLink", id] as const,
  emailBatch: (id: string) => [...ROOT, "emailBatch", id] as const,
};
