import "server-only";

import { Schema, type Types } from "mongoose";

import { DATE_ONLY_PATTERN, isValidTimeZone } from "@/lib/dates";
import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";

import {
  COUPLE_NAME_MAX_LENGTH,
  DEFAULT_TIME_ZONE,
  DEFAULT_WEBSITE_THEME,
  FORMATTED_ADDRESS_MAX_LENGTH,
  LOCATION_PART_MAX_LENGTH,
  WEBSITE_THEMES,
  WEDDING_DESCRIPTION_MAX_LENGTH,
  WEDDING_SLUG_MAX_LENGTH,
  WEDDING_SLUG_PATTERN,
  WEDDING_TITLE_MAX_LENGTH,
  WELCOME_MESSAGE_MAX_LENGTH,
  YOUTUBE_URL_MAX_LENGTH,
  type WebsiteTheme,
} from "./wedding.constants";

/**
 * `weddings` — the tenant (DATABASE_DESIGN §13–22). Small 1:1 configuration is
 * embedded (location, website, gallery, livestream); growing data lives in
 * its own collections. Soft-deleted via `deletedAt` (DATABASE_DESIGN §93).
 *
 * Not tenant-guarded: a wedding is the tenant itself. Queries still filter
 * `deletedAt: null`.
 */
export interface WeddingLocation {
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
}

export interface WeddingWebsite {
  /** Stable once created; never regenerated when names/date change (SYSTEM_DESIGN §27). */
  slug: string;
  theme: WebsiteTheme;
  isPublished: boolean;
  welcomeMessage: string | null;
}

export interface WeddingGallery {
  /**
   * Stable gallery share secret, stored raw so the gallery URL / printed QR can
   * be rebuilt (binding decision 2, API_DESIGN §108). select:false.
   */
  token: string;
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
}

export interface WeddingLivestream {
  youtubeUrl: string | null;
  isEnabled: boolean;
}

export interface WeddingDoc {
  brideName: string;
  groomName: string;
  title: string | null;
  description: string | null;
  /** Date-only `YYYY-MM-DD` — never a timestamp (DATABASE_DESIGN §14). */
  weddingDate: string;
  /** IANA zone used to render event times (DATABASE_DESIGN §15). */
  timeZone: string;
  coverImageObjectKey: string | null;
  location: WeddingLocation;
  website: WeddingWebsite;
  gallery: WeddingGallery;
  livestream: WeddingLivestream;
  createdByUserId: Types.ObjectId;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WeddingRecord = WithId<WeddingDoc>;

const locationSchema = new Schema<WeddingLocation>(
  {
    formattedAddress: {
      type: String,
      trim: true,
      maxlength: FORMATTED_ADDRESS_MAX_LENGTH,
      default: null,
    },
    city: { type: String, trim: true, maxlength: LOCATION_PART_MAX_LENGTH, default: null },
    state: { type: String, trim: true, maxlength: LOCATION_PART_MAX_LENGTH, default: null },
    country: { type: String, trim: true, maxlength: LOCATION_PART_MAX_LENGTH, default: null },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    googlePlaceId: { type: String, trim: true, maxlength: 300, default: null },
  },
  { _id: false },
);

const websiteSchema = new Schema<WeddingWebsite>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: WEDDING_SLUG_MAX_LENGTH,
      match: WEDDING_SLUG_PATTERN,
    },
    theme: { type: String, enum: WEBSITE_THEMES, required: true, default: DEFAULT_WEBSITE_THEME },
    isPublished: { type: Boolean, required: true, default: false },
    welcomeMessage: {
      type: String,
      trim: true,
      maxlength: WELCOME_MESSAGE_MAX_LENGTH,
      default: null,
    },
  },
  { _id: false },
);

const gallerySchema = new Schema<WeddingGallery>(
  {
    token: { type: String, required: true, select: false },
    // Off until organisers enable them in Settings (see "Open decisions").
    isEnabled: { type: Boolean, required: true, default: false },
    guestUploadsEnabled: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const livestreamSchema = new Schema<WeddingLivestream>(
  {
    youtubeUrl: { type: String, trim: true, maxlength: YOUTUBE_URL_MAX_LENGTH, default: null },
    isEnabled: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const weddingSchema = new Schema<WeddingDoc>(
  {
    brideName: { type: String, required: true, trim: true, maxlength: COUPLE_NAME_MAX_LENGTH },
    groomName: { type: String, required: true, trim: true, maxlength: COUPLE_NAME_MAX_LENGTH },
    title: { type: String, trim: true, maxlength: WEDDING_TITLE_MAX_LENGTH, default: null },
    description: {
      type: String,
      trim: true,
      maxlength: WEDDING_DESCRIPTION_MAX_LENGTH,
      default: null,
    },
    weddingDate: { type: String, required: true, match: DATE_ONLY_PATTERN },
    timeZone: {
      type: String,
      required: true,
      default: DEFAULT_TIME_ZONE,
      validate: { validator: isValidTimeZone, message: "Unknown IANA time zone" },
    },
    coverImageObjectKey: { type: String, default: null },
    location: { type: locationSchema, required: true, default: () => ({}) },
    website: { type: websiteSchema, required: true },
    gallery: { type: gallerySchema, required: true },
    livestream: { type: livestreamSchema, required: true, default: () => ({}) },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  baseSchemaOptions("weddings"),
);

weddingSchema.index({ "website.slug": 1 }, { unique: true, name: "website_slug_unique" });
weddingSchema.index({ "gallery.token": 1 }, { unique: true, name: "gallery_token_unique" });
weddingSchema.index({ createdAt: 1 }, { name: "createdAt" });

export const WeddingModel = defineModel<WeddingDoc>("Wedding", weddingSchema);
