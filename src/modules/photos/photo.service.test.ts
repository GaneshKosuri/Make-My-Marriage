import { describe, it } from "vitest";

/**
 * Test plan for photosService / publicGalleryService (Phase 6: Memories). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("photosService / publicGalleryService", () => {
  describe("uploads (API_DESIGN §76–77, §81–82 + 2026-09-18 notes)", () => {
    it.todo("only JPEG/PNG/WebP, 1 byte to 10 MiB");
    it.todo("staging keys are server-issued inside the wedding namespace");
    it.todo("confirmation verifies length, MIME and the 16-byte signature, pinned to the ETag");
    it.todo("confirmation is idempotent and cannot resurrect a deleted photo");
    it.todo("member issuance is rate limited per member, then per wedding, after validation");
  });
  describe("gallery (API_DESIGN §75, §78–80)", () => {
    it.todo("lists READY photos only with cursor pagination");
    it.todo("delete removes the R2 object first, then tombstones");
    it.todo("an invalid gallery token cannot upload (SYSTEM_DESIGN §91)");
    it.todo("disabled gallery or guest uploads are refused");
  });
});
