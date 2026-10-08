import "server-only";

import { randomBytes } from "node:crypto";

import { OBJECT_ID_PATTERN } from "@/lib/object-id";

/**
 * R2 object keys (DATABASE_DESIGN §102–103):
 *
 *   weddings/{weddingId}/gallery/{random}.{ext}
 *   weddings/{weddingId}/covers/{random}.{ext}
 *   weddings/{weddingId}/events/{eventId}/{random}.{ext}
 *   staging/weddings/{weddingId}/{purpose}/{random}.{ext}   ← browser PUT target
 *
 * Keys are built only from server-derived ids and random bytes — never from
 * user-supplied filenames — and the weddingId always comes from the session
 * or the gallery token, never from the client.
 */

export const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageMimeType = keyof typeof IMAGE_EXTENSIONS;
export type StagingPurpose = "gallery" | "covers" | "events";

function assertId(id: string, label: string): void {
  if (!OBJECT_ID_PATTERN.test(id)) throw new Error(`Invalid ${label} for an object key`);
}

function randomName(mimeType: ImageMimeType): string {
  return `${randomBytes(16).toString("hex")}.${IMAGE_EXTENSIONS[mimeType]}`;
}

export function weddingPrefix(weddingId: string): string {
  assertId(weddingId, "weddingId");
  return `weddings/${weddingId.toLowerCase()}/`;
}

export function galleryObjectKey(weddingId: string, mimeType: ImageMimeType): string {
  return `${weddingPrefix(weddingId)}gallery/${randomName(mimeType)}`;
}

export function weddingCoverKey(weddingId: string, mimeType: ImageMimeType): string {
  return `${weddingPrefix(weddingId)}covers/${randomName(mimeType)}`;
}

export function eventCoverKey(weddingId: string, eventId: string, mimeType: ImageMimeType): string {
  assertId(eventId, "eventId");
  return `${weddingPrefix(weddingId)}events/${eventId.toLowerCase()}/${randomName(mimeType)}`;
}

export function stagingKey(
  weddingId: string,
  purpose: StagingPurpose,
  mimeType: ImageMimeType,
): string {
  return `staging/${weddingPrefix(weddingId)}${purpose}/${randomName(mimeType)}`;
}

/** True when `key` is a final or staging key inside this wedding's namespace. */
export function isKeyInWeddingNamespace(key: string, weddingId: string): boolean {
  const prefix = weddingPrefix(weddingId);
  return (
    (key.startsWith(prefix) || key.startsWith(`staging/${prefix}`)) &&
    !key.includes("..") &&
    /^[a-z0-9/._-]+$/.test(key)
  );
}
