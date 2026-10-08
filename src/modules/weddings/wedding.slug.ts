import "server-only";

import { notImplemented } from "@/server/errors";

/**
 * Website slug generation (SYSTEM_DESIGN §27, DATABASE_DESIGN §18):
 *   1. normalise names (lowercase, strip accents and unsupported characters)
 *   2. `brideName-groomName-ddmmyyyy`
 *   3. check uniqueness; on collision append `-2`, `-3`, …
 * Generated once at wedding creation and never changed automatically.
 */
export async function generateUniqueWeddingSlug(input: {
  brideName: string;
  groomName: string;
  weddingDate: string;
}): Promise<string> {
  return notImplemented("SYSTEM_DESIGN §27 (Phase 1: Foundation)");
}
