/**
 * Wedding DTOs and inputs (API_DESIGN §17–19, §67–74, §84). Isomorphic.
 * TODO: derive inputs from ./wedding.schemas.ts with z.infer once defined.
 */
import type { WebsiteTheme } from "./wedding.constants";

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

export interface CreateWeddingInput {
  brideName: string;
  groomName: string;
  title?: string;
  description?: string;
  weddingDate: string;
  timeZone: string;
  location?: Partial<WeddingLocationDto>;
}

export type UpdateWeddingInput = Partial<Omit<CreateWeddingInput, "timeZone">> & {
  timeZone?: string;
};

/** GET /api/wedding/website (API_DESIGN §67). The slug is system-managed. */
export interface WebsiteSettingsDto {
  slug: string;
  theme: WebsiteTheme;
  isPublished: boolean;
  welcomeMessage: string | null;
}

export interface UpdateWebsiteSettingsInput {
  theme?: WebsiteTheme;
  welcomeMessage?: string | null;
  isPublished?: boolean;
}

/** GET/PATCH /api/wedding/livestream (API_DESIGN §70–72). */
export interface LivestreamSettingsDto {
  youtubeUrl: string | null;
  isEnabled: boolean;
}

export interface UpdateLivestreamInput {
  youtubeUrl?: string | null;
  isEnabled?: boolean;
}

/** GET /api/gallery/settings (API_DESIGN §73). */
export interface GallerySettingsDto {
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
  galleryUrl: string;
  qrUrl: string;
}

export interface UpdateGallerySettingsInput {
  isEnabled?: boolean;
  guestUploadsEnabled?: boolean;
}

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
  coverImageUrl: string | null;
  theme: WebsiteTheme;
  events: PublicWebsiteEventDto[];
  gallery: { enabled: boolean };
  livestream: { enabled: boolean; youtubeUrl: string | null };
}
