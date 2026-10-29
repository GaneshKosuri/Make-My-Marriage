import { describe, it } from "vitest";

/**
 * Test plan for weddingsService (Phase 1: Foundation / Phase 5). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("weddingsService", () => {
  // createWedding: tests/integration/create-wedding.test.ts, wedding.slug.test.ts, wedding.schemas.test.ts
  // getWedding: tests/integration/dashboard.test.ts (no gallery token, member-only)
  // updateWedding: tests/integration/wedding-settings.test.ts (slug unchanged, partial, no weddingId)
  describe("website, livestream, gallery settings (API_DESIGN §67–74, §84)", () => {
    it.todo("unpublished or deleted website → NOT_FOUND");
    it.todo("only supported YouTube URL formats are accepted");
    it.todo("gallery URL uses NEXT_PUBLIC_APP_URL, never the Host header");
  });
});
