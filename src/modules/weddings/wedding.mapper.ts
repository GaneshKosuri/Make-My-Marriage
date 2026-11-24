import "server-only";

import type { IdentityWedding } from "@/server/auth/identity";
import { youTubeEmbedUrl, youTubeVideoId } from "@/lib/youtube";
import { getEnv } from "@/server/config/env";

import type { WeddingRecord } from "./wedding.model";
import type { CreatedWeddingDto, WeddingDto } from "./wedding.types";

/**
 * Document → DTO. Never exposes `gallery.token` except through the explicit
 * share-URL paths (API_DESIGN §73, §84), and never `deletedAt` internals.
 * TODO: toWebsiteSettingsDto / toPublicWeddingDto (Phase 5), toGallerySettingsDto (Phase 6).
 */
export function toIdentityWedding(wedding: WeddingRecord): IdentityWedding {
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    city: wedding.location?.city ?? null,
    state: wedding.location?.state ?? null,
  };
}

/** The privacy-enhanced YouTube player for a stored livestream link. */
function embedUrlFor(youtubeUrl: string | null): string | null {
  const videoId = youtubeUrl ? youTubeVideoId(youtubeUrl) : null;
  return videoId ? youTubeEmbedUrl(videoId) : null;
}

/** The public website address (`/w/<slug>`), from NEXT_PUBLIC_APP_URL. */
export function websiteUrlFor(slug: string): string {
  return new URL(`/w/${slug}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
}

/** GET /api/wedding (API_DESIGN §18): no gallery token, no internal fields. */
export function toWeddingDto(wedding: WeddingRecord): WeddingDto {
  const location = wedding.location;
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    description: wedding.description ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    location: {
      formattedAddress: location?.formattedAddress ?? null,
      city: location?.city ?? null,
      state: location?.state ?? null,
      country: location?.country ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      googlePlaceId: location?.googlePlaceId ?? null,
    },
    website: {
      slug: wedding.website.slug,
      theme: wedding.website.theme,
      isPublished: wedding.website.isPublished,
      welcomeMessage: wedding.website.welcomeMessage ?? null,
      showGallery: wedding.website.showGallery ?? false,
      url: websiteUrlFor(wedding.website.slug),
    },
    gallery: {
      isEnabled: wedding.gallery.isEnabled,
      guestUploadsEnabled: wedding.gallery.guestUploadsEnabled,
    },
    livestream: {
      youtubeUrl: wedding.livestream?.youtubeUrl ?? null,
      isEnabled: wedding.livestream?.isEnabled ?? false,
      embedUrl: embedUrlFor(wedding.livestream?.youtubeUrl ?? null),
    },
  };
}

/** POST /api/wedding (API_DESIGN §17). */
export function toCreatedWeddingDto(wedding: WeddingRecord): CreatedWeddingDto {
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    weddingDate: wedding.weddingDate,
    website: { slug: wedding.website.slug },
  };
}
