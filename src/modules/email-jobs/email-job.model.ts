import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  EMAIL_JOB_LAST_ERROR_MAX_LENGTH,
  EMAIL_JOB_STATUSES,
  EMAIL_JOB_TYPES,
  type EmailJobStatus,
  type EmailJobType,
} from "./email-job.constants";

/**
 * `email_jobs` — one document per email (DATABASE_DESIGN §66–75). Claimed
 * atomically PENDING → PROCESSING (lockedAt/lockId) so overlapping cron runs
 * never double-send; stale locks are reclaimed. The worker is the one
 * sanctioned cross-wedding reader (tenant-guard opt-out).
 */
export interface EmailJobDoc {
  weddingId: Types.ObjectId;
  type: EmailJobType;
  guestId: Types.ObjectId;
  recipientEmail: string;
  status: EmailJobStatus;
  batchId: string | null;
  /** e.g. guestId + type + campaign; also sent to Resend as Idempotency-Key. */
  idempotencyKey: string;
  attempts: number;
  nextAttemptAt: Date;
  lockedAt: Date | null;
  lockId: string | null;
  sentAt: Date | null;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailJobRecord = WithId<EmailJobDoc>;

const emailJobSchema = new Schema<EmailJobDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    type: { type: String, enum: EMAIL_JOB_TYPES, required: true },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest", required: true },
    recipientEmail: { type: String, required: true, trim: true, maxlength: 254 },
    status: { type: String, enum: EMAIL_JOB_STATUSES, required: true, default: "PENDING" },
    batchId: { type: String, default: null },
    idempotencyKey: { type: String, required: true },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    // Eligible immediately unless a retry delay is scheduled.
    nextAttemptAt: { type: Date, required: true, default: () => new Date() },
    lockedAt: { type: Date, default: null },
    lockId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    providerMessageId: { type: String, default: null },
    lastError: { type: String, maxlength: EMAIL_JOB_LAST_ERROR_MAX_LENGTH, default: null },
  },
  baseSchemaOptions("email_jobs"),
);

emailJobSchema.index({ idempotencyKey: 1 }, { unique: true, name: "idempotencyKey_unique" });
emailJobSchema.index(
  { status: 1, nextAttemptAt: 1, createdAt: 1 },
  { name: "status_nextAttemptAt_createdAt" },
);
emailJobSchema.index({ weddingId: 1, status: 1 }, { name: "weddingId_status" });
emailJobSchema.index({ batchId: 1 }, { name: "batchId" });
emailJobSchema.index({ guestId: 1 }, { name: "guestId" });

emailJobSchema.plugin(tenantGuardPlugin);

export const EmailJobModel = defineModel<EmailJobDoc>("EmailJob", emailJobSchema);
