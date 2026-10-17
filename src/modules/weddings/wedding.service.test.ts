import { describe, it } from "vitest";

/**
 * Test plan for weddingsService (Phase 1: Foundation / Phase 5). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("weddingsService", () => {
  // createWedding: tests/integration/create-wedding.test.ts, wedding.slug.test.ts, wedding.schemas.test.ts
  describe("getWedding / updateWedding (API_DESIGN §18–19)", () => {
    it.todo("never returns the gallery token or hashes");
    it.todo("keeps the slug unchanged when names or date change");
    it.todo("rejects a client-supplied weddingId");
  });
  describe("website, livestream, gallery settings (API_DESIGN §67–74, §84)", () => {
    it.todo("unpublished or deleted website → NOT_FOUND");
    it.todo("only supported YouTube URL formats are accepted");
    it.todo("gallery URL uses NEXT_PUBLIC_APP_URL, never the Host header");
  });
});
