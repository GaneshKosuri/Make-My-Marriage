"use client";

/**
 * Direct photo uploads from the browser (SYSTEM_DESIGN §37–40; API_DESIGN
 * §76–77, §81–82): ask the app for a signed PUT, send the file straight to
 * storage, then ask the app to confirm. A small preview for the grid is made
 * in the browser and sent alongside (decided 2026-11-20). Shared by the family
 * gallery and the guest gallery; only the two endpoints differ.
 */
import { apiFetch } from "@/lib/api-client";
import { putToStorage } from "@/lib/direct-upload";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_PREVIEW_SIZE_BYTES,
  MAX_PHOTO_SIZE_BYTES,
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

/**
 * One photo, start to finish. The preview is best effort: if it can't be made
 * or sent, the photo is still uploaded and confirmed.
 */
export async function uploadPhoto(
  endpoints: UploadEndpoints,
  file: File,
  eventId: string | null,
  onProgress?: (fraction: number) => void,
): Promise<PhotoDto> {
  const preview = await makePreview(file);
  const details = {
    filename: file.name,
    mimeType: file.type as PhotoMimeType,
    sizeBytes: file.size,
    eventId,
  };
  const issued = await apiFetch<PhotoUploadUrlDto>(endpoints.uploadUrl, {
    method: "POST",
    body: {
      ...details,
      ...(preview && {
        preview: { mimeType: preview.type as PhotoPreviewMimeType, sizeBytes: preview.size },
      }),
    },
  });
  await putToStorage(issued, file, (fraction) => onProgress?.(fraction * 0.95));
  if (issued.preview && preview) {
    await putToStorage(issued.preview, preview).catch(() => undefined);
  }
  const photo = await apiFetch<PhotoDto>(endpoints.confirm, {
    method: "POST",
    body: { ...details, objectKey: issued.objectKey },
  });
  onProgress?.(1);
  return photo;
}
