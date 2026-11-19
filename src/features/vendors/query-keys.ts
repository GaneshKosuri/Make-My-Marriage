/**
 * features/vendors — My Vendors and vendor discovery (Phase 4).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["vendors"] as const;

/** TanStack Query keys. Invalidate `vendorsKeys.all` after any mutation in this domain. */
export const vendorsKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
};

const DISCOVERY_ROOT = ["vendor-discovery"] as const;

/**
 * Discovery keys sit outside `vendorsKeys.all` on purpose: every search is a
 * billed Google request limited per wedding, so saving a vendor must not
 * refetch the results (the saved place is marked in the cache instead).
 */
export const vendorDiscoveryKeys = {
  all: DISCOVERY_ROOT,
  search: (query: Record<string, unknown>) => [...DISCOVERY_ROOT, "search", query] as const,
  place: (placeId: string) => [...DISCOVERY_ROOT, "place", placeId] as const,
};
