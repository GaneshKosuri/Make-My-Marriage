"use client";

/**
 * Direct photo uploads from the browser (SYSTEM_DESIGN §37–40; API_DESIGN
 * §76–77, §81–82): ask the app for a signed PUT, send the file straight to
 * storage, then ask the app to confirm. A small preview for the grid is made
 * in the browser and sent alongside (decided 2026-11-20). Shared by the family
 * gallery and the guest gallery; only the two endpoints differ.
 */
import { ApiError, apiFetch } from "@/lib/api-client";
import { putToStorage } from "@/lib/direct-upload";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_PREVIEW_SIZE_BYTES,
  MAX_PHOTO_SIZE_BYTES,
  PHOTO_CONFIRMATION_GRACE_HOURS,
  PHOTO_PREVIEW_MAX_EDGE,
  type PhotoMimeType,
  type PhotoPreviewMimeType,
} from "@/modules/photos/photo.constants";
import type { PhotoDto, PhotoUploadUrlDto } from "@/modules/photos/photo.types";

import { UPLOAD } from "./gallery-content";

/** The `accept` list for the file input; iPhones then hand over JPEGs instead of HEIC. */
export const PHOTO_ACCEPT = ALLOWED_PHOTO_MIME_TYPES.join(",");

export interface UploadEndpoints {
  /** POST: returns a signed PUT (and the preview's). */
  uploadUrl: string;
  /** POST: confirms the upload and returns the published photo. */
  confirm: string;
}

/** Why a file can't be uploaded, before anything is sent; null when it's fine. */
export function fileProblem(file: File): string | null {
  if (!(ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return UPLOAD.invalid.type;
  }
  if (file.size === 0) return UPLOAD.invalid.empty;
  if (file.size > MAX_PHOTO_SIZE_BYTES) return UPLOAD.invalid.size;
  return null;
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * A copy at most 640 px on its longest edge, WebP where the browser can make
 * it and JPEG otherwise. Re-encoding drops the original's metadata (location
 * included). Null when the browser can't decode the photo; the gallery then
 * shows the original instead.
 */
export async function makePreview(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PHOTO_PREVIEW_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const [type, quality] of [
      ["image/webp", 0.8],
      ["image/jpeg", 0.8],
      ["image/jpeg", 0.6],
    ] as const) {
      const blob = await canvasToBlob(canvas, type, quality);
      // Some browsers silently fall back to PNG for WebP: only keep what we asked for.
      if (blob && blob.type === type && blob.size <= MAX_PHOTO_PREVIEW_SIZE_BYTES) return blob;
    }
    return null;
  } catch {
    return null;
  }
}

/** How far one photo got: kept on the queue item so a retry can resume (QA G2). */
export interface UploadStage {
  /** The staging key the upload URL was issued for (the confirm body uses it). */
  objectKey: string;
  expiresAt: string;
  /** The album it was reserved for: a confirm must repeat it exactly. */
  eventId: string | null;
  /** The file reached storage; only the confirm is left. */
  uploaded: boolean;
}

const GRACE_MS = PHOTO_CONFIRMATION_GRACE_HOURS * 60 * 60 * 1000;

/** The server still accepts a confirm for this upload (24 h after its URL expired). */
export function canResume(stage: UploadStage | null, now = Date.now()): stage is UploadStage {
  return Boolean(stage?.uploaded && now < Date.parse(stage.expiresAt) + GRACE_MS);
}

/**
 * One photo, start to finish: upload URL, PUT (and the preview's), confirm.
 * With a `resume` stage whose file already reached storage, only the confirm is
 * repeated with the same key: the server's confirm is idempotent, so a lost
 * response never becomes a second photo (QA G2). The preview is best effort.
 */
export async function uploadPhoto(
  endpoints: UploadEndpoints,
  file: File,
  eventId: string | null,
  {
    onProgress,
    onStage,
    resume,
  }: {
    onProgress?: (fraction: number) => void;
    onStage?: (stage: UploadStage) => void;
    resume?: UploadStage | null;
  } = {},
): Promise<PhotoDto> {
  const detailsFor = (album: string | null) => ({
    filename: file.name,
    mimeType: file.type as PhotoMimeType,
    sizeBytes: file.size,
    eventId: album,
  });

  let stage: UploadStage;
  if (canResume(resume ?? null)) {
    stage = resume!;
  } else {
    const preview = await makePreview(file);
    const issued = await apiFetch<PhotoUploadUrlDto>(endpoints.uploadUrl, {
      method: "POST",
      body: {
        ...detailsFor(eventId),
        ...(preview && {
          preview: { mimeType: preview.type as PhotoPreviewMimeType, sizeBytes: preview.size },
        }),
      },
    });
    stage = { objectKey: issued.objectKey, expiresAt: issued.expiresAt, eventId, uploaded: false };
    onStage?.(stage);
    await putToStorage(issued, file, (fraction) => onProgress?.(fraction * 0.95));
    if (issued.preview && preview) {
      await putToStorage(issued.preview, preview).catch(() => undefined);
    }
    stage = { ...stage, uploaded: true };
    onStage?.(stage);
  }

  const photo = await apiFetch<PhotoDto>(endpoints.confirm, {
    method: "POST",
    body: { ...detailsFor(stage.eventId), objectKey: stage.objectKey },
  });
  onProgress?.(1);
  return photo;
}

/** What a failed upload means for the person (QA G1). */
export interface UploadFailure {
  /** The reason to show; null for a plain "Couldn't upload". */
  problem: string | null;
  /** "Try again" can help (network, server trouble, a check that may pass on a fresh upload). */
  retryable: boolean;
  /** Too many uploads for now: the rest of the batch should wait. */
  rateLimited: boolean;
  /** A retry must start from scratch (the upload itself has to be redone). */
  restart: boolean;
}

export function uploadFailure(error: unknown): UploadFailure {
  if (!(error instanceof ApiError) || error.status === 0) {
    return { problem: null, retryable: true, rateLimited: false, restart: false };
  }
  switch (error.code) {
    case "RATE_LIMITED":
      return { problem: UPLOAD.rateLimited, retryable: true, rateLimited: true, restart: false };
    case "FORBIDDEN":
      return { problem: error.message, retryable: false, rateLimited: false, restart: false };
    case "NOT_FOUND":
      return { problem: UPLOAD.notAvailable, retryable: false, rateLimited: false, restart: false };
    case "VALIDATION_ERROR": {
      const detail = error.details ? Object.values(error.details)[0] : undefined;
      return {
        problem: detail ?? error.message,
        retryable: false,
        rateLimited: false,
        restart: false,
      };
    }
    case "UPLOAD_ERROR":
      // The server's check failed (missing upload, expired, wrong file): say why,
      // and let "Try again" redo the upload from the start.
      return { problem: error.message, retryable: true, rateLimited: false, restart: true };
    default:
      return { problem: null, retryable: true, rateLimited: false, restart: false };
  }
}
