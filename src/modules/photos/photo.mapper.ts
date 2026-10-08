import "server-only";

/**
 * Photo document → DTO with a freshly signed read URL (15 min). Never exposes
 * `uploadKey`, staging keys, `weddingId` or uploader membership ids to guests.
 *
 * TODO(Phase 6: Memories): toPhotoDto(record, signedUrl), toPublicGalleryDto(...).
 */
export {};
