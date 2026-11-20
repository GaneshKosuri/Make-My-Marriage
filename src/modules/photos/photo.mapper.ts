import "server-only";

import type { StorageService } from "@/server/storage";

import { PHOTO_READ_URL_TTL_SECONDS } from "./photo.constants";
import type { PhotoRecord } from "./photo.model";
import type { PhotoDto } from "./photo.types";

/**
 * Photo document → DTO with freshly signed read URLs (15 min). Never exposes
 * `uploadKey`, staging or final keys, `weddingId` or the uploader's membership.
 */
export async function toPhotoDto(photo: PhotoRecord, storage: StorageService): Promise<PhotoDto> {
  const [original, preview] = await Promise.all([
    storage.presignGet({ key: photo.objectKey, expiresInSeconds: PHOTO_READ_URL_TTL_SECONDS }),
    photo.previewObjectKey
      ? storage.presignGet({
          key: photo.previewObjectKey,
          expiresInSeconds: PHOTO_READ_URL_TTL_SECONDS,
        })
      : null,
  ]);
  return {
    id: photo._id.toString(),
    eventId: photo.eventId?.toString() ?? null,
    url: original.url,
    previewUrl: preview?.url ?? null,
    originalFilename: photo.originalFilename,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    uploaderType: photo.uploaderType,
    createdAt: photo.createdAt.toISOString(),
  };
}

export function toPhotoDtos(
  photos: readonly PhotoRecord[],
  storage: StorageService,
): Promise<PhotoDto[]> {
  return Promise.all(photos.map((photo) => toPhotoDto(photo, storage)));
}
