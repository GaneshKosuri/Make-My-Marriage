import { describe, it } from "vitest";

/**
 * Test plan for publicGalleryService (Phase 6, slice 4). The family gallery
 * (photosService) is covered end to end in tests/integration/photos.test.ts:
 * upload URLs (types, sizes, events, staging keys, the per-member limit after
 * validation), confirmation (length, type, signature, previews, idempotency,
 * expiry, other uploaders, deleted photos), album lists with cursors and totals,
 * downloads and deletes, cross-wedding 404s.
 */
describe("publicGalleryService", () => {
  it.todo("an invalid gallery token cannot upload (SYSTEM_DESIGN §91)");
  it.todo("disabled gallery or guest uploads are refused");
  it.todo("guest uploads are limited per wedding per day");
});
