import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  VENDOR_ADDRESS_MAX_LENGTH,
  VENDOR_CATEGORIES,
  VENDOR_CONTACT_MAX_LENGTH,
  VENDOR_EMAIL_MAX_LENGTH,
  VENDOR_NAME_MAX_LENGTH,
  VENDOR_NOTES_MAX_LENGTH,
  VENDOR_PHONE_MAX_LENGTH,
  VENDOR_SOURCES,
  VENDOR_WEBSITE_MAX_LENGTH,
  type VendorCategory,
  type VendorSource,
} from "./vendor.constants";

/**
 * `vendors` (DATABASE_DESIGN §49–54). Archived, not deleted, because expenses
 * reference vendors. Records added from Google Places copy useful fields so
 * they keep working if Google is unavailable.
 */
export interface VendorDoc {
  weddingId: Types.ObjectId;
  name: string;
  category: VendorCategory;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  /** Integer paise (DATABASE_DESIGN §50). */
  totalAgreedCostPaise: number | null;
  eventIds: Types.ObjectId[];
  notes: string | null;
  source: VendorSource;
  googlePlaceId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VendorRecord = WithId<VendorDoc>;

const vendorSchema = new Schema<VendorDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    name: { type: String, required: true, trim: true, maxlength: VENDOR_NAME_MAX_LENGTH },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: VENDOR_CONTACT_MAX_LENGTH,
      default: null,
    },
    phone: { type: String, trim: true, maxlength: VENDOR_PHONE_MAX_LENGTH, default: null },
    email: { type: String, trim: true, maxlength: VENDOR_EMAIL_MAX_LENGTH, default: null },
    address: { type: String, trim: true, maxlength: VENDOR_ADDRESS_MAX_LENGTH, default: null },
    website: { type: String, trim: true, maxlength: VENDOR_WEBSITE_MAX_LENGTH, default: null },
    totalAgreedCostPaise: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: "totalAgreedCostPaise must be an integer",
      },
    },
    eventIds: { type: [{ type: Schema.Types.ObjectId, ref: "Event" }], default: [] },
    notes: { type: String, trim: true, maxlength: VENDOR_NOTES_MAX_LENGTH, default: null },
    source: { type: String, enum: VENDOR_SOURCES, required: true, default: "MANUAL" },
    googlePlaceId: { type: String, trim: true, maxlength: 300, default: null },
    archivedAt: { type: Date, default: null },
  },
  baseSchemaOptions("vendors"),
);

vendorSchema.index({ weddingId: 1, category: 1 }, { name: "weddingId_category" });
vendorSchema.index({ weddingId: 1, archivedAt: 1 }, { name: "weddingId_archivedAt" });
// Serves the (weddingId, googlePlaceId) lookup AND enforces one Google place
// per wedding (DATABASE_DESIGN §53). Manual vendors (googlePlaceId: null) are excluded.
vendorSchema.index(
  { weddingId: 1, googlePlaceId: 1 },
  {
    unique: true,
    partialFilterExpression: { googlePlaceId: { $type: "string" } },
    name: "weddingId_googlePlaceId_unique",
  },
);

vendorSchema.plugin(tenantGuardPlugin);

export const VendorModel = defineModel<VendorDoc>("Vendor", vendorSchema);
