/**
 * Photo DTOs and inputs (API_DESIGN §75–82 + 2026-09-18 notes). Isomorphic.
 * TODO(Phase 6): derive inputs from ./photo.schemas.ts with z.infer.
 */
import type { CursorQuery } from "@/lib/pagination";

import type { PhotoMimeType, UploaderType } from "./photo.constants";

/** A READY gallery photo. `url` is a short-lived signed read URL. */
export interface PhotoDto {
  id: string;
  eventId: string | null;
  url: string;
  originalFilename: string | null;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  uploaderType: UploaderType;
  createdAt: string;
}

export interface ListPhotosQuery extends CursorQuery {
  /** An event id, or "other" for unassigned photos. */
  eventId?: string;
}

export interface PhotoUploadRequestInput {
  filename: string;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  eventId?: string | null;
}

/** POST …/upload-url (API_DESIGN §76, §81). */
export interface PhotoUploadUrlDto {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  /** Headers the browser must send with the PUT (signed). */
  headers: Record<string, string>;
}

export interface ConfirmPhotoUploadInput {
  objectKey: string;
  filename: string;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  eventId?: string | null;
}

/** GET /api/photos/:photoId/download (2026-09-18 notes). */
export interface PhotoDownloadDto {
  url: string;
}

/** GET /api/public/galleries/:token (API_DESIGN §80). */
export interface PublicGalleryDto {
  wedding: { brideName: string; groomName: string; weddingDate: string };
  guestUploadsEnabled: boolean;
  events: { id: string; name: string }[];
}
