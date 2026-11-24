import "server-only";

import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import { getStorageService, hasImageSignature, stagingKey, weddingPrefix } from "@/server/storage";

import {
  COVER_MAX_SIZE_BYTES,
  COVER_MIME_TYPES,
  COVER_READ_URL_TTL_SECONDS,
  COVER_UPLOAD_URL_TTL_SECONDS,
  type CoverMimeType,
} from "./wedding.constants";
import type { CoverUploadRequestInput, CoverUploadUrlDto } from "./wedding.types";

/**
 * The wedding cover photo (PRD §9.18 hero; API_DESIGN §83; DATABASE_DESIGN
 * §65). Same direct-upload design as gallery photos, without a reservation
 * row: the browser PUTs to a server-made staging key, then saving the website
 * settings with that key verifies the object (size, type, file signature,
 * pinned to its ETag) and copies it to a new final key. A wedding has at most
 * one cover; the previous one is deleted.
 */

const isCoverMime = (value: string | null): value is CoverMimeType =>
  value !== null && (COVER_MIME_TYPES as readonly string[]).includes(value);

/** Staging keys for covers of this wedding: `staging/weddings/<id>/covers/<random>.<ext>`. */
function isCoverStagingKey(key: string, weddingId: string): boolean {
  const prefix = `staging/${weddingPrefix(weddingId)}covers/`;
  return key.startsWith(prefix) && /^[0-9a-f]{32}\.(jpg|png|webp)$/.test(key.slice(prefix.length));
}

/**
 * The final key a staged cover is copied to: same random name, under the
 * wedding's covers. Deriving it (instead of a new random name) lets a repeated
 * save of the same upload recognise that it is already the cover (QA W4).
 * Null for anything that isn't this wedding's cover staging key.
 */
export function finalCoverKeyFor(weddingId: string, stagedKey: string): string | null {
  if (!isCoverStagingKey(stagedKey, weddingId)) return null;
  return stagedKey.slice("staging/".length);
}

/** A signed PUT for a new cover (10 minutes), pinning type and length. */
export async function issueCoverUpload(
  weddingId: string,
  input: CoverUploadRequestInput,
): Promise<CoverUploadUrlDto> {
  const key = stagingKey(weddingId, "covers", input.mimeType);
  const signed = await getStorageService().presignPut({
    key,
    contentType: input.mimeType,
    contentLength: input.sizeBytes,
    expiresInSeconds: COVER_UPLOAD_URL_TTL_SECONDS,
  });
  return {
    uploadUrl: signed.url,
    objectKey: key,
    expiresAt: signed.expiresAt.toISOString(),
    headers: signed.headers,
  };
}

const uploadProblem = (message: string) =>
  new AppError("UPLOAD_ERROR", message, { details: { coverImageObjectKey: message } });

/**
 * Checks the uploaded cover and copies it to its final key. Another wedding's
 * key, a gallery key or a made-up key is refused like a missing upload.
 */
export async function publishCover(weddingId: string, stagedKey: string): Promise<string> {
  if (!isCoverStagingKey(stagedKey, weddingId)) {
    throw uploadProblem("Upload the cover photo again.");
  }
  const storage = getStorageService();
  const info = await storage.head(stagedKey);
  if (!info) throw uploadProblem("We couldn't find the uploaded photo. Please try again.");
  if (
    !isCoverMime(info.contentType) ||
    info.sizeBytes < 1 ||
    info.sizeBytes > COVER_MAX_SIZE_BYTES
  ) {
    throw uploadProblem("Use a JPEG, PNG or WebP photo up to 10 MB.");
  }
  const head = await storage.readRange(stagedKey, { ifMatch: info.etag });
  if (!hasImageSignature(info.contentType, head)) {
    throw uploadProblem("This file isn't a JPEG, PNG or WebP photo.");
  }
  const finalKey = finalCoverKeyFor(weddingId, stagedKey)!;
  await storage.copy({ sourceKey: stagedKey, destinationKey: finalKey, ifMatch: info.etag });
  await storage.delete(stagedKey).catch(() => undefined);
  return finalKey;
}

/** Best effort: a leftover old cover costs a little storage, never correctness. */
export async function removeCoverObject(key: string | null): Promise<void> {
  if (!key) return;
  try {
    await getStorageService().delete(key);
  } catch {
    logger.warn("Old cover photo not deleted", { reason: "storage" });
  }
}

/** A short-lived signed link to the cover; null without one. */
export async function coverUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  const signed = await getStorageService().presignGet({
    key,
    expiresInSeconds: COVER_READ_URL_TTL_SECONDS,
  });
  return signed.url;
}
