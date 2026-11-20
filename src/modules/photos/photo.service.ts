import "server-only";

import type { CursorResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { decodeCursor, sliceCursorPage } from "@/server/http/pagination";
import { logger } from "@/server/logging/logger";
import { getRateLimiter, policies } from "@/server/security/rate-limit";
import { getStorageService, IMAGE_EXTENSIONS } from "@/server/storage";

import { eventsService } from "@/modules/events";

import { PHOTO_EVENT_FILTER_OTHER, PHOTO_READ_URL_TTL_SECONDS } from "./photo.constants";
import { confirmPhotoUpload, issuePhotoUpload } from "./photo-upload";
import { toPhotoDtos } from "./photo.mapper";
import { photoRepository, type PhotoAlbumFilter } from "./photo.repository";
import type {
  ConfirmPhotoUploadInput,
  ListPhotosQuery,
  PhotoDownloadDto,
  PhotoDto,
  PhotoUploadRequestInput,
  PhotoUploadUrlDto,
} from "./photo.types";

/** The album a list asks for, and the scope its cursor is bound to. */
function albumOf(eventId: string | undefined): { filter: PhotoAlbumFilter; scope: string } {
  if (eventId === undefined) return { filter: {}, scope: "all" };
  if (eventId === PHOTO_EVENT_FILTER_OTHER) return { filter: { eventId: null }, scope: "other" };
  return { filter: { eventId }, scope: eventId };
}

/**
 * Family gallery (PRD §9.20–9.21; SYSTEM_DESIGN §37–42; API_DESIGN §75–78 +
 * 2026-09-18 notes). Phase 6. Any member (Admin or Manager) can upload, view,
 * download and delete any photo. All storage goes through getStorageService().
 */
export const photosService = {
  /**
   * READY photos newest first, 24 per page by default (max 48), with the
   * album's total. A cursor only works for the album it was issued for. API §75.
   */
  async list(ctx: MemberContext, query: ListPhotosQuery): Promise<CursorResult<PhotoDto>> {
    const { filter, scope } = albumOf(query.eventId);
    const after = query.cursor ? decodeCursor(query.cursor, scope) : undefined;
    const [rows, total] = await Promise.all([
      photoRepository.listReady(ctx.weddingId, filter, { after, limit: query.limit }),
      photoRepository.countReady(ctx.weddingId, filter),
    ]);
    const { items, nextCursor } = sliceCursorPage(rows, query.limit, scope);
    return {
      items: await toPhotoDtos(items, getStorageService()),
      pagination: { nextCursor, total },
    };
  },

  /**
   * The event must be an active event of this wedding. Only then is the
   * member's quota used: 120 per member, then 600 per wedding, per 15 minutes
   * (2026-09-18 notes). API §76.
   */
  async requestUploadUrl(
    ctx: MemberContext,
    input: PhotoUploadRequestInput,
  ): Promise<PhotoUploadUrlDto> {
    if (input.eventId) {
      await eventsService.assertActiveEventsInWedding(ctx.weddingId, [input.eventId], "eventId");
    }
    await getRateLimiter().enforce([
      { policy: policies.photoUploadPerMember, subject: ctx.membershipId },
      { policy: policies.photoUploadPerWedding, subject: ctx.weddingId },
    ]);
    return issuePhotoUpload(
      ctx.weddingId,
      { type: "MEMBER", membershipId: ctx.membershipId },
      input,
    );
  },

  /** Verifies and publishes the member's own upload; idempotent. API §77. */
  async confirmUpload(ctx: MemberContext, input: ConfirmPhotoUploadInput): Promise<PhotoDto> {
    return confirmPhotoUpload(
      ctx.weddingId,
      { type: "MEMBER", membershipId: ctx.membershipId },
      input,
    );
  },

  /**
   * A newly signed GET that downloads as the original file name; the browser
   * fetches the photo from storage directly (2026-09-18 notes).
   */
  async getDownloadUrl(ctx: MemberContext, photoId: string): Promise<PhotoDownloadDto> {
    const photo = await photoRepository.findReadyById(ctx.weddingId, photoId);
    if (!photo) throw new AppError("NOT_FOUND");
    const signed = await getStorageService().presignGet({
      key: photo.objectKey,
      expiresInSeconds: PHOTO_READ_URL_TTL_SECONDS,
      attachmentFilename:
        photo.originalFilename ?? `wedding-photo.${IMAGE_EXTENSIONS[photo.mimeType]}`,
    });
    return { url: signed.url };
  },

  /**
   * Removes the photo and its preview from storage, then tombstones the row.
   * A storage failure keeps the photo (the error is retryable). API §78.
   */
  async delete(ctx: MemberContext, photoId: string): Promise<void> {
    const photo = await photoRepository.findReadyById(ctx.weddingId, photoId);
    if (!photo) throw new AppError("NOT_FOUND");
    const storage = getStorageService();
    await storage.delete(photo.objectKey);
    if (photo.previewObjectKey) await storage.delete(photo.previewObjectKey);
    await photoRepository.markDeleted(ctx.weddingId, photoId);
    logger.info("Photo deleted", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      photoId,
    });
  },

  /** Dashboard "Photos: 312". */
  async countForDashboard(weddingId: string): Promise<number> {
    return photoRepository.countReady(weddingId, {});
  },
};
