import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  GUEST_DEFAULT_MAX_GUESTS,
  GUEST_EMAIL_MAX_LENGTH,
  GUEST_MAX_GUESTS_MAX,
  GUEST_MAX_GUESTS_MIN,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTES_MAX_LENGTH,
  GUEST_PHONE_MAX_LENGTH,
  RSVP_STATUSES,
  type RsvpStatus,
} from "./guest.constants";

/**
 * `guests` (DATABASE_DESIGN §41–48). One record = one invitation (a family/group),
 * with the invitation token and RSVP embedded. Hard-deleted (also cancels the
 * guest's pending EmailJobs). Updates and RSVPs are conditional on `__v`.
 */
export interface GuestDoc {
  weddingId: Types.ObjectId;
  name: string;
  email: string | null;
  /** For search only. Deliberately NOT unique: families share addresses. */
  emailNormalized: string | null;
  /** Strings, never numbers ("+" and leading zeros matter). */
  phone: string | null;
  maxGuests: number;
  invitedEventIds: Types.ObjectId[];
  notes: string | null;
  /**
   * Stable share secret (binding decision 1): 32 random bytes, base64url,
   * stored raw so the same link can be re-shared. select:false; never in CRUD
   * responses or logs (API_DESIGN §44, §108).
   */
  invitationToken: string;
  invitationSentAt: Date | null;
  lastReminderSentAt: Date | null;
  reminderCount: number;
  rsvpStatus: RsvpStatus;
  attendingCount: number | null;
  rsvpUpdatedAt: Date | null;
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

export type GuestRecord = WithId<GuestDoc>;

const guestSchema = new Schema<GuestDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    name: { type: String, required: true, trim: true, maxlength: GUEST_NAME_MAX_LENGTH },
    email: { type: String, trim: true, maxlength: GUEST_EMAIL_MAX_LENGTH, default: null },
    emailNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: GUEST_EMAIL_MAX_LENGTH,
      default: null,
    },
    phone: { type: String, trim: true, maxlength: GUEST_PHONE_MAX_LENGTH, default: null },
    maxGuests: {
      type: Number,
      required: true,
      min: GUEST_MAX_GUESTS_MIN,
      max: GUEST_MAX_GUESTS_MAX,
      default: GUEST_DEFAULT_MAX_GUESTS,
      validate: { validator: Number.isInteger, message: "maxGuests must be an integer" },
    },
    invitedEventIds: { type: [{ type: Schema.Types.ObjectId, ref: "Event" }], default: [] },
    notes: { type: String, trim: true, maxlength: GUEST_NOTES_MAX_LENGTH, default: null },
    invitationToken: { type: String, required: true, select: false },
    invitationSentAt: { type: Date, default: null },
    lastReminderSentAt: { type: Date, default: null },
    reminderCount: { type: Number, required: true, min: 0, default: 0 },
    rsvpStatus: { type: String, enum: RSVP_STATUSES, required: true, default: "PENDING" },
    attendingCount: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: (value: number | null) => value === null || Number.isInteger(value),
        message: "attendingCount must be an integer",
      },
    },
    rsvpUpdatedAt: { type: Date, default: null },
  },
  { ...baseSchemaOptions("guests"), optimisticConcurrency: true },
);

guestSchema.index({ invitationToken: 1 }, { unique: true, name: "invitationToken_unique" });
guestSchema.index({ weddingId: 1, rsvpStatus: 1 }, { name: "weddingId_rsvpStatus" });
guestSchema.index({ weddingId: 1, name: 1 }, { name: "weddingId_name" });
guestSchema.index({ weddingId: 1, emailNormalized: 1 }, { name: "weddingId_emailNormalized" });
guestSchema.index({ weddingId: 1, invitedEventIds: 1 }, { name: "weddingId_invitedEventIds" });

guestSchema.plugin(tenantGuardPlugin);

export const GuestModel = defineModel<GuestDoc>("Guest", guestSchema);
