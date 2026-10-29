import "server-only";

/** MongoDB E11000: a write hit a unique index. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000
  );
}
