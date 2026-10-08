import "server-only";

import type { CursorResult } from "@/lib/pagination";
import type { PublicContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  ConfirmPhotoUploadInput,
  ListPhotosQuery,
  PhotoDto,
  PhotoUploadRequestInput,
  PhotoUploadUrlDto,
  PublicGalleryDto,
} from "./photo.types";

/**
 * Guest gallery via the wedding-level gallery token (PRD §9.22–9.23;
 * SYSTEM_DESIGN §24–25, §39–40; API_DESIGN §79–82). Phase 6.
 * weddingId is derived from the token (gallerySettingsService.resolveGalleryToken),
 * never from the client. Invalid token → generic NOT_FOUND; disabled gallery or
 * guest uploads → FORBIDDEN/NOT_FOUND per final UX.
 */
export const publicGalleryService = {
  /** API §80. */
  async getGallery(ctx: PublicContext, token: string): Promise<PublicGalleryDto> {
    return notImplemented("API_DESIGN §80 (Phase 6: Memories)");
  },

  /** Gallery-safe photo objects; cursor pagination. API §79. */
  async listPhotos(
    ctx: PublicContext,
    token: string,
    query: ListPhotosQuery,
  ): Promise<CursorResult<PhotoDto>> {
    return notImplemented("API_DESIGN §79 (Phase 6: Memories)");
  },

  /** Gallery + guest uploads enabled; uploaderType GUEST. Rate limited. API §81. */
  async requestUploadUrl(
    ctx: PublicContext,
    token: string,
    input: PhotoUploadRequestInput,
  ): Promise<PhotoUploadUrlDto> {
    return notImplemented("API_DESIGN §81 (Phase 6: Memories)");
  },

  /** No moderation stage. Rate limited. API §82. */
  async confirmUpload(
    ctx: PublicContext,
    token: string,
    input: ConfirmPhotoUploadInput,
  ): Promise<PhotoDto> {
    return notImplemented("API_DESIGN §82 (Phase 6: Memories)");
  },
};
