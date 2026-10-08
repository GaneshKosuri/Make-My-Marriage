/**
 * Gallery photos (PRD §9.20–9.23; DATABASE_DESIGN §60–64 + photo lifecycle
 * extension; API_DESIGN §75–82 + 2026-09-18 notes). Isomorphic.
 */

/** Only READY rows appear in gallery queries; DELETED is a hidden tombstone. */
export const PHOTO_STATUSES = ["PENDING", "READY", "DELETED"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

export const UPLOADER_TYPES = ["MEMBER", "GUEST"] as const;
export type UploaderType = (typeof UPLOADER_TYPES)[number];

/** JPEG, PNG, WebP only — no SVG, video or HEIC (2026-09-18 notes). */
export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export const MIN_PHOTO_SIZE_BYTES = 1;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
/** Files per selection batch in the UI; uploads run sequentially. */
export const MAX_PHOTOS_PER_BATCH = 20;
export const PHOTO_ORIGINAL_FILENAME_MAX_LENGTH = 255;

export const PHOTO_UPLOAD_URL_TTL_SECONDS = 10 * 60;
export const PHOTO_READ_URL_TTL_SECONDS = 15 * 60;
/** A pending upload can be confirmed until 24 h after its PUT URL expires. */
export const PHOTO_CONFIRMATION_GRACE_HOURS = 24;

/** `eventId=other` selects unassigned "Wedding Memories" photos. */
export const PHOTO_EVENT_FILTER_OTHER = "other";
