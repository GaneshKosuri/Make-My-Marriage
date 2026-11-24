import "server-only";

import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import {
  galleryObjectKey,
  galleryPreviewKey,
  getStorageService,
  hasImageSignature,
  isKeyInWeddingNamespace,
  stagingKey,
  type StorageService,
} from "@/server/storage";

import {
  MAX_PHOTO_PREVIEW_SIZE_BYTES,
  PHOTO_CONFIRMATION_GRACE_HOURS,
  PHOTO_UPLOAD_URL_TTL_SECONDS,
  type PhotoPreviewMimeType,
  type UploaderType,
} from "./photo.constants";
import { toPhotoDto } from "./photo.mapper";
import type { PhotoRecord } from "./photo.model";
import { photoRepository } from "./photo.repository";
import type {
  ConfirmPhotoUploadInput,
  PhotoDto,
  PhotoUploadRequestInput,
  PhotoUploadUrlDto,
  SignedUploadDto,
} from "./photo.types";

/**
 * The direct-upload lifecycle shared by family members and guests (SYSTEM_DESIGN
 * §37–40; API_DESIGN §76–77, §81–82 + 2026-09-18 notes):
 *
 *   issue    reserve a PENDING row with a server-made staging key, sign a PUT
 *            (10 min) that pins Content-Type and Content-Length
 *   confirm  match the reserved metadata, check the stored object's length,
 *            type and file signature (pinned to its ETag), copy it to a new
 *            final key, then PENDING → READY atomically
 *
 * A replayed PUT can only overwrite the staging object, never a published
 * photo. Confirmation is idempotent; a deleted photo can't be confirmed again.
 */

export type Uploader =
  | { type: Extract<UploaderType, "MEMBER">; membershipId: string }
  | { type: Extract<UploaderType, "GUEST"> };

const GRACE_MS = PHOTO_CONFIRMATION_GRACE_HOURS * 60 * 60 * 1000;

function uploadProblem(message: string): AppError {
  return new AppError("UPLOAD_ERROR", message);
}

async function signPut(
  storage: StorageService,
  key: string,
  contentType: string,
  contentLength: number,
): Promise<SignedUploadDto> {
  const signed = await storage.presignPut({
    key,
    contentType,
    contentLength,
    expiresInSeconds: PHOTO_UPLOAD_URL_TTL_SECONDS,
  });
  return {
    uploadUrl: signed.url,
    objectKey: key,
    expiresAt: signed.expiresAt.toISOString(),
    headers: signed.headers,
  };
}

/** Reserves the upload and signs its PUT (and the preview's). Validation is the caller's. */
export async function issuePhotoUpload(
  weddingId: string,
  uploader: Uploader,
  input: PhotoUploadRequestInput,
): Promise<PhotoUploadUrlDto> {
  const storage = getStorageService();
  const uploadKey = stagingKey(weddingId, "gallery", input.mimeType);
  const previewUploadKey = input.preview
    ? stagingKey(weddingId, "gallery", input.preview.mimeType)
    : null;

  await photoRepository.reservePending(weddingId, {
    eventId: input.eventId ?? null,
    objectKey: uploadKey,
    uploadKey,
    expiresAt: new Date(Date.now() + PHOTO_UPLOAD_URL_TTL_SECONDS * 1000),
    originalFilename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploaderType: uploader.type,
    uploadedByMembershipId: uploader.type === "MEMBER" ? uploader.membershipId : null,
    previewUploadKey,
    previewObjectKey: null,
    previewMimeType: input.preview?.mimeType ?? null,
    previewSizeBytes: input.preview?.sizeBytes ?? null,
  });

  const [original, preview] = await Promise.all([
    signPut(storage, uploadKey, input.mimeType, input.sizeBytes),
    input.preview && previewUploadKey
      ? signPut(storage, previewUploadKey, input.preview.mimeType, input.preview.sizeBytes)
      : null,
  ]);
  return { ...original, preview };
}

/** The reservation for this upload, as long as it belongs to this uploader. */
function sameUploader(photo: PhotoRecord, uploader: Uploader): boolean {
  if (photo.uploaderType !== uploader.type) return false;
  return (
    uploader.type === "GUEST" || photo.uploadedByMembershipId?.toString() === uploader.membershipId
  );
}

function sameMetadata(photo: PhotoRecord, input: ConfirmPhotoUploadInput): boolean {
  return (
    photo.originalFilename === input.filename &&
    photo.mimeType === input.mimeType &&
    photo.sizeBytes === input.sizeBytes &&
    (photo.eventId?.toString() ?? null) === (input.eventId ?? null)
  );
}

/**
 * Copies a verified preview to its final key; null when it is missing or not
 * what was reserved. A preview problem never fails the photo itself.
 */
async function publishPreview(
  storage: StorageService,
  weddingId: string,
  photo: PhotoRecord,
): Promise<string | null> {
  if (!photo.previewUploadKey || !photo.previewMimeType) return null;
  try {
    const info = await storage.head(photo.previewUploadKey);
    if (
      !info ||
      info.sizeBytes !== photo.previewSizeBytes ||
      info.sizeBytes > MAX_PHOTO_PREVIEW_SIZE_BYTES ||
      info.contentType !== photo.previewMimeType
    ) {
      return null;
    }
    const head = await storage.readRange(photo.previewUploadKey, { ifMatch: info.etag });
    if (!hasImageSignature(photo.previewMimeType, head)) return null;
    const key = galleryPreviewKey(weddingId, photo.previewMimeType as PhotoPreviewMimeType);
    await storage.copy({
      sourceKey: photo.previewUploadKey,
      destinationKey: key,
      ifMatch: info.etag,
    });
    return key;
  } catch (error) {
    logger.warn("Photo preview not published", {
      weddingId,
      photoId: photo._id.toString(),
      errorName: (error as { name?: string } | undefined)?.name,
    });
    return null;
  }
}

/** Best effort: staging objects are also removed by the bucket's lifecycle rule. */
async function removeQuietly(storage: StorageService, keys: readonly (string | null)[]) {
  await Promise.all(
    keys
      .filter((key): key is string => Boolean(key))
      .map((key) => storage.delete(key).catch(() => undefined)),
  );
}

/**
 * Verifies the uploaded object and publishes the photo. Unknown, other
 * uploaders' and deleted uploads all look the same (NOT_FOUND).
 */
export async function confirmPhotoUpload(
  weddingId: string,
  uploader: Uploader,
  input: ConfirmPhotoUploadInput,
): Promise<PhotoDto> {
  const storage = getStorageService();
  if (!isKeyInWeddingNamespace(input.objectKey, weddingId)) throw new AppError("NOT_FOUND");
  const photo = await photoRepository.findByUploadKey(weddingId, input.objectKey);
  if (!photo || photo.status === "DELETED" || !sameUploader(photo, uploader)) {
    throw new AppError("NOT_FOUND");
  }
  if (!sameMetadata(photo, input)) {
    throw uploadProblem("This doesn't match the photo the upload was started for.");
  }
  // Retried after an ambiguous response: already published.
  if (photo.status === "READY") return toPhotoDto(photo, storage);
  if (Date.now() > photo.expiresAt.getTime() + GRACE_MS) {
    throw uploadProblem("This upload has expired. Please upload the photo again.");
  }

  const info = await storage.head(photo.uploadKey);
  if (!info) throw uploadProblem("We couldn't find the uploaded photo. Please try again.");
  if (info.sizeBytes !== photo.sizeBytes || info.contentType !== photo.mimeType) {
    throw uploadProblem("The uploaded file isn't the photo that was chosen. Please try again.");
  }
  const head = await storage.readRange(photo.uploadKey, { ifMatch: info.etag });
  if (!hasImageSignature(photo.mimeType, head)) {
    throw uploadProblem("This file isn't a JPEG, PNG or WebP photo.");
  }

  const objectKey = galleryObjectKey(weddingId, photo.mimeType);
  await storage.copy({ sourceKey: photo.uploadKey, destinationKey: objectKey, ifMatch: info.etag });
  const previewObjectKey = await publishPreview(storage, weddingId, photo);

  const published = await photoRepository.publish(weddingId, photo._id.toString(), {
    objectKey,
    previewObjectKey,
  });
  if (!published) {
    // Another confirmation won the race: drop our copies and answer with its result.
    await removeQuietly(storage, [objectKey, previewObjectKey]);
    const current = await photoRepository.findByUploadKey(weddingId, input.objectKey);
    if (current?.status === "READY") return toPhotoDto(current, storage);
    throw new AppError("NOT_FOUND");
  }
  await removeQuietly(storage, [photo.uploadKey, photo.previewUploadKey]);
  logger.info("Photo published", {
    weddingId,
    photoId: published._id.toString(),
    uploaderType: uploader.type,
  });
  return toPhotoDto(published, storage);
}
