/**
 * features/guests — Guest list, guest page and RSVP status (Phase 3).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver). Client code may
 * import only `*.constants`, `*.schemas` and `*.types` from `@/modules/*`;
 * mutations always go through the REST API.
 */

const ROOT = ["guests"] as const;

/** TanStack Query keys. Invalidate `guestsKeys.all` after any mutation in this domain. */
export const guestsKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
  rsvpSummary: () => [...ROOT, "rsvp-summary"] as const,
  invitationLink: (id: string) => [...ROOT, "invitation-link", id] as const,
  emailBatch: (batchId: string) => ["email-batch", batchId] as const,
};
