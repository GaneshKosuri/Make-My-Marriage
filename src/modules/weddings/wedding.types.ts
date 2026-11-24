/**
 * Wedding DTOs and inputs (API_DESIGN §17–19, §67–74, §84). Isomorphic.
 * TODO: derive the remaining inputs from ./wedding.schemas.ts as they are defined.
 */
import type { z } from "zod";

import type { WebsiteTheme } from "./wedding.constants";
import type {
  createWeddingSchema,
  updateGallerySettingsSchema,
  updateLivestreamSchema,
  updateWebsiteSettingsSchema,
  updateWeddingSchema,
} from "./wedding.schemas";

export interface WeddingLocationDto {
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
}

/** GET /api/wedding (API_DESIGN §18). No token hashes or gallery token. */
export interface WeddingDto {
  id: string;
  brideName: string;
  groomName: string;
  title: string | null;
  description: string | null;
  weddingDate: string;
  timeZone: string;
  location: WeddingLocationDto;
  website: WebsiteSettingsDto;
  gallery: { isEnabled: boolean; guestUploadsEnabled: boolean };
  livestream: LivestreamSettingsDto;
}

/** POST /api/wedding response (API_DESIGN §17). */
export interface CreatedWeddingDto {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  website: { slug: string };
}

export type CreateWeddingInput = z.output<typeof createWeddingSchema>;

export type UpdateWeddingInput = z.output<typeof updateWeddingSchema>;

/** GET /api/wedding/website (API_DESIGN §67). The slug is system-managed. */
export interface WebsiteSettingsDto {
  slug: string;
  theme: WebsiteTheme;
  isPublished: boolean;
  welcomeMessage: string | null;
  /** Gallery button on the website (decided 2026-11-24). */
  showGallery: boolean;
  /** The website's address, from NEXT_PUBLIC_APP_URL. */
  url: string;
}

export type UpdateWebsiteSettingsInput = z.output<typeof updateWebsiteSettingsSchema>;

/** GET/PATCH /api/wedding/livestream (API_DESIGN §70–72). */
export interface LivestreamSettingsDto {
  /** The stored link, always `https://www.youtube.com/watch?v=<id>`. */
  youtubeUrl: string | null;
  isEnabled: boolean;
  /** The privacy-enhanced player for that video; null without a link. */
  embedUrl: string | null;
}

export type UpdateLivestreamInput = z.output<typeof updateLivestreamSchema>;

/** GET /api/gallery/settings (API_DESIGN §73). */
export interface GallerySettingsDto {
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
  galleryUrl: string;
  qrUrl: string;
}

export type UpdateGallerySettingsInput = z.output<typeof updateGallerySettingsSchema>;

/** GET /api/gallery/qr — option A: the frontend renders the QR (API_DESIGN §84). */
export interface GalleryQrDto {
  galleryUrl: string;
}

/** POST /api/wedding/cover/upload-url, /api/events/:id/cover/upload-url (API_DESIGN §83). */
export interface CoverUploadRequestInput {
  mimeType: string;
  sizeBytes: number;
}

export interface CoverUploadUrlDto {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  headers: Record<string, string>;
}

/** An event on the public website (PRD §9.18). */
export interface PublicWebsiteEventDto {
  name: string;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  dressCode: string | null;
  /** A Google Maps search for the venue and address; null without either. */
  mapUrl: string | null;
}

/**
 * GET /api/public/weddings/:slug (API_DESIGN §69). The one DTO every website
 * theme renders (SYSTEM_DESIGN §28): themes change presentation, not content.
 */
export interface PublicWeddingDto {
  brideName: string;
  groomName: string;
  title: string | null;
  description: string | null;
  welcomeMessage: string | null;
  weddingDate: string;
  timeZone: string;
  /** "Dehradun, Uttarakhand"; null when no place is set. */
  place: string | null;
  /** A short-lived signed link to the cover photo. */
  coverImageUrl: string | null;
  theme: WebsiteTheme;
  /** Active events in start order (decided 2026-11-24: every active event shows). */
  events: PublicWebsiteEventDto[];
  /** The gallery button: only when the gallery is on and the family shows it. */
  gallery: { enabled: boolean; url: string | null };
  /** The player shows only while switched on with a link (decided 2026-11-24). */
  livestream: { enabled: boolean; youtubeUrl: string | null; embedUrl: string | null };
}
