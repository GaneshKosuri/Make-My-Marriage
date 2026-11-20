import "server-only";

import type { CursorResult } from "@/lib/pagination";
import type { PublicContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { getRateLimiter, policies } from "@/server/security/rate-limit";

import { eventsService } from "@/modules/events";
import { gallerySettingsService, type GalleryAccess } from "@/modules/weddings";

import { listAlbumPhotos } from "./photo-albums";
import { confirmPhotoUpload, issuePhotoUpload } from "./photo-upload";
import type {
  ConfirmPhotoUploadInput,
  ListPhotosQuery,
  PhotoDto,
  PhotoUploadRequestInput,
  PhotoUploadUrlDto,
  PublicGalleryDto,
} from "./photo.types";

const GUEST = { type: "GUEST" } as const;
const UPLOADS_OFF = "The family has turned off uploads.";

/**
 * The open gallery: an unknown token, a deleted wedding and a gallery that is
 * switched off all look the same (NOT_FOUND), so a link reveals nothing.
 */
async function openGallery(token: string): Promise<GalleryAccess> {
  const access = await gallerySettingsService.resolveGalleryToken(token);
  if (!access?.isEnabled) throw new AppError("NOT_FOUND");
  return access;
}

/** The gallery is open and the family lets guests add photos. */
async function openForUploads(token: string): Promise<GalleryAccess> {
  const access = await openGallery(token);
  if (!access.guestUploadsEnabled) throw new AppError("FORBIDDEN", UPLOADS_OFF);
  return access;
}

/** Guests see no file names (they can carry people's names). */
const forGuests = (photo: PhotoDto): PhotoDto => ({ ...photo, originalFilename: null });

/**
 * Guest gallery via the wedding-level gallery token (PRD §9.22–9.23;
 * SYSTEM_DESIGN §24–25, §39–40; API_DESIGN §79–82). Phase 6. The wedding comes
 * from the token, never from the client. Guests view and upload; they can't
 * delete or download through the app (PRD §9.20).
 */
export const publicGalleryService = {
  /** The couple, whether guests can upload, and the albums. API §80. */
  async getGallery(_ctx: PublicContext, token: string): Promise<PublicGalleryDto> {
    const access = await openGallery(token);
    return {
      wedding: {
        brideName: access.brideName,
        groomName: access.groomName,
        weddingDate: access.weddingDate,
        timeZone: access.timeZone,
      },
      guestUploadsEnabled: access.guestUploadsEnabled,
      events: await eventsService.listAlbumNames(access.weddingId),
    };
  },

  /** Gallery-safe photos by album, cursor pages. API §79. */
  async listPhotos(
    _ctx: PublicContext,
    token: string,
    query: ListPhotosQuery,
  ): Promise<CursorResult<PhotoDto>> {
    const access = await openGallery(token);
    const page = await listAlbumPhotos(access.weddingId, query);
    return { ...page, items: page.items.map(forGuests) };
  },

  /**
   * A signed PUT for one guest photo. The event must be an active event of the
   * wedding; then the wedding's daily guest allowance is used (500 a day,
   * decided 2026-11-20) on top of the per-IP route limit. API §81.
   */
  async requestUploadUrl(
    _ctx: PublicContext,
    token: string,
    input: PhotoUploadRequestInput,
  ): Promise<PhotoUploadUrlDto> {
    const access = await openForUploads(token);
    if (input.eventId) {
      await eventsService.assertActiveEventsInWedding(access.weddingId, [input.eventId], "eventId");
    }
    await getRateLimiter().enforce([
      { policy: policies.guestPhotoUploadPerWedding, subject: access.weddingId },
    ]);
    return issuePhotoUpload(access.weddingId, GUEST, input);
  },

  /** Verifies and publishes a guest upload (uploaderType GUEST); no moderation. API §82. */
  async confirmUpload(
    _ctx: PublicContext,
    token: string,
    input: ConfirmPhotoUploadInput,
  ): Promise<PhotoDto> {
    const access = await openForUploads(token);
    return forGuests(await confirmPhotoUpload(access.weddingId, GUEST, input));
  },
};
