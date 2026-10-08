import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  MIN_PHOTO_SIZE_BYTES,
  PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
  PHOTO_STATUSES,
  UPLOADER_TYPES,
  type PhotoMimeType,
  type PhotoStatus,
  type UploaderType,
} from "./photo.constants";

/**
 * `photos` — metadata only; binaries live in R2 (DATABASE_DESIGN §60–64).
 *
 * Lifecycle extension (DATABASE_DESIGN, 2026-09-18; binding decision 5):
 *   PENDING  server reserved `uploadKey` (staging) and issued a PUT URL
 *   READY    verified, copied to an independent final key, visible in the gallery
 *   DELETED  R2 object removed; the row stays as a hidden tombstone so a late
 *            confirmation cannot resurrect it
 * `createdAt` (reservation time) + `_id` are the stable pagination keys.
 * Deliberately NO TTL on `expiresAt`: dropping the only metadata reference
 * before object cleanup would orphan R2 objects.
 */
export interface PhotoDoc {
  weddingId: Types.ObjectId;
  eventId: Types.ObjectId | null;
  /** Staging key while PENDING; replaced atomically by the final key when READY. */
  objectKey: string;
  /** Server-issued staging key, kept for idempotent confirmation. */
  uploadKey: string;
  status: PhotoStatus;
  /** PUT URL expiry; confirmation is accepted until +24 h. */
  expiresAt: Date;
  originalFilename: string | null;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  uploaderType: UploaderType;
  uploadedByMembershipId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PhotoRecord = WithId<PhotoDoc>;

const photoSchema = new Schema<PhotoDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    objectKey: { type: String, required: true },
    uploadKey: { type: String, required: true },
    status: { type: String, enum: PHOTO_STATUSES, required: true, default: "PENDING" },
    expiresAt: { type: Date, required: true },
    originalFilename: {
      type: String,
      trim: true,
      maxlength: PHOTO_ORIGINAL_FILENAME_MAX_LENGTH,
      default: null,
    },
    mimeType: { type: String, enum: ALLOWED_PHOTO_MIME_TYPES, required: true },
    sizeBytes: {
      type: Number,
      required: true,
      min: MIN_PHOTO_SIZE_BYTES,
      max: MAX_PHOTO_SIZE_BYTES,
      validate: { validator: Number.isInteger, message: "sizeBytes must be an integer" },
    },
    uploaderType: { type: String, enum: UPLOADER_TYPES, required: true },
    uploadedByMembershipId: {
      type: Schema.Types.ObjectId,
      ref: "WeddingMembership",
      default: null,
    },
  },
  baseSchemaOptions("photos"),
);

photoSchema.index({ objectKey: 1 }, { unique: true, name: "objectKey_unique" });
photoSchema.index({ uploadKey: 1 }, { unique: true, name: "uploadKey_unique" });
// DATABASE_DESIGN §91 listing indexes…
photoSchema.index({ weddingId: 1, createdAt: 1 }, { name: "weddingId_createdAt" });
photoSchema.index(
  { weddingId: 1, eventId: 1, createdAt: 1 },
  { name: "weddingId_eventId_createdAt" },
);
// …and the lifecycle listing indexes (READY-only gallery queries, createdAt DESC, _id DESC).
photoSchema.index(
  { weddingId: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "weddingId_status_createdAt_id" },
);
photoSchema.index(
  { weddingId: 1, status: 1, eventId: 1, createdAt: -1, _id: -1 },
  { name: "weddingId_status_eventId_createdAt_id" },
);

photoSchema.plugin(tenantGuardPlugin);

export const PhotoModel = defineModel<PhotoDoc>("Photo", photoSchema);
