/**
 * Photo DTOs and inputs (API_DESIGN §75–82 + 2026-09-18 notes). Isomorphic.
 */
import type { z } from "zod";

import type { PhotoMimeType, UploaderType } from "./photo.constants";
import type {
  confirmPhotoUploadSchema,
  listPhotosQuerySchema,
  photoUploadRequestSchema,
} from "./photo.schemas";

/**
 * A READY gallery photo. `url` (the original) and `previewUrl` (the small grid
 * copy, null when the photo has none) are short-lived signed read URLs.
 */
export interface PhotoDto {
  id: string;
  eventId: string | null;
  url: string;
  previewUrl: string | null;
  originalFilename: string | null;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  uploaderType: UploaderType;
  createdAt: string;
}

export type ListPhotosQuery = z.output<typeof listPhotosQuerySchema>;
export type PhotoUploadRequestInput = z.output<typeof photoUploadRequestSchema>;
export type ConfirmPhotoUploadInput = z.output<typeof confirmPhotoUploadSchema>;

/** A signed PUT the browser sends the file with. */
export interface SignedUploadDto {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  /** Headers the browser must send unchanged (they are signed). */
  headers: Record<string, string>;
}

/** POST …/upload-url (API_DESIGN §76, §81), plus the preview's PUT when one was asked for. */
export interface PhotoUploadUrlDto extends SignedUploadDto {
  preview: SignedUploadDto | null;
}

/** GET /api/photos/:photoId/download (2026-09-18 notes). */
export interface PhotoDownloadDto {
  url: string;
}

/**
 * GET /api/public/galleries/:token (API_DESIGN §80). `timeZone` (not in the
 * doc) dates guests' photos the way the family sees them.
 */
export interface PublicGalleryDto {
  wedding: { brideName: string; groomName: string; weddingDate: string; timeZone: string };
  guestUploadsEnabled: boolean;
  events: { id: string; name: string }[];
}
