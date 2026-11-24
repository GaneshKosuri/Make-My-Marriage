/**
 * Photo and gallery request schemas (Zod, `.strict()`). Isomorphic. A client
 * `weddingId` is never accepted; staging keys are server-issued (API_DESIGN
 * §75–82 + 2026-09-18 notes).
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";
import { cursorQuerySchema } from "@/lib/pagination";

import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_PREVIEW_SIZE_BYTES,
  MAX_PHOTO_SIZE_BYTES,
  MIN_PHOTO_SIZE_BYTES,
  PHOTO_EVENT_FILTER_OTHER,
  PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
  PHOTO_PREVIEW_MIME_TYPES,
} from "./photo.constants";

export const photoIdParams = z.object({ photoId: objectId }).strict();

/** "IMG_1001.jpg". Kept for display and as the download name; never part of a key. */
const filename = z
  .string("Choose a photo")
  .trim()
  .min(1, "Choose a photo")
  .max(PHOTO_ORIGINAL_FILENAME_MAX_LENGTH, "The file name is too long")
  .regex(/^[^\u0000-\u001f\u007f/\\]+$/, "The file name has characters we can't use");

const mimeType = z.enum(ALLOWED_PHOTO_MIME_TYPES, "Use a JPEG, PNG or WebP photo");

const sizeBytes = z
  .number("Choose a photo")
  .int("Choose a photo")
  .min(MIN_PHOTO_SIZE_BYTES, "This photo is empty")
  .max(MAX_PHOTO_SIZE_BYTES, "Photos can be up to 10 MB");

/** An active event of the wedding, or null / absent for "Wedding Memories". */
const eventId = objectId.nullable().optional();

/** The grid preview the browser made (optional; decided 2026-11-20). */
const preview = z
  .object({
    mimeType: z.enum(PHOTO_PREVIEW_MIME_TYPES, "Use a WebP or JPEG preview"),
    sizeBytes: z
      .number()
      .int()
      .min(MIN_PHOTO_SIZE_BYTES, "The preview is empty")
      .max(MAX_PHOTO_PREVIEW_SIZE_BYTES, "The preview is too large"),
  })
  .strict();

/** POST /api/photos/upload-url and the guest equivalent (API_DESIGN §76, §81). */
export const photoUploadRequestSchema = z
  .object({ filename, mimeType, sizeBytes, eventId, preview: preview.optional() })
  .strict();

/**
 * POST /api/photos and the guest equivalent (API_DESIGN §77, §82): the
 * documented body; `objectKey` is the staging key the upload URL was issued for.
 */
export const confirmPhotoUploadSchema = z
  .object({
    objectKey: z.string().trim().min(1).max(300),
    filename,
    mimeType,
    sizeBytes,
    eventId,
  })
  .strict();

/** GET /api/photos (API_DESIGN §75 + 2026-09-18): `eventId=other` = Wedding Memories. */
export const listPhotosQuerySchema = cursorQuerySchema
  .extend({ eventId: z.union([objectId, z.literal(PHOTO_EVENT_FILTER_OTHER)]).optional() })
  .strict();
