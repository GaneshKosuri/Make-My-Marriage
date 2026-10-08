/**
 * features/photos — Gallery, uploads, QR code (Phase 6).
 *
 * Client UI for this domain lives here: components/, hooks (TanStack Query over
 * `@/lib/api-client`), and forms (React Hook Form + zodResolver with the
 * module's `*.schemas.ts`). Client code may import only `*.constants`,
 * `*.schemas` and `*.types` from `@/modules/*`; mutations always go through the REST API.
 */

const ROOT = ["photos"] as const;

/** TanStack Query keys. Invalidate `photosKeys.all` after any mutation in this domain. */
export const photosKeys = {
  all: ROOT,
  list: (query: Record<string, unknown> = {}) => [...ROOT, "list", query] as const,
  gallerySettings: () => [...ROOT, "gallerySettings"] as const,
  qr: () => [...ROOT, "qr"] as const,
};
