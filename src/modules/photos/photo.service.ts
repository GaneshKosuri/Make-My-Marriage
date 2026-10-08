import "server-only";

import type { CursorResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  ConfirmPhotoUploadInput,
  ListPhotosQuery,
  PhotoDownloadDto,
  PhotoDto,
  PhotoUploadRequestInput,
  PhotoUploadUrlDto,
} from "./photo.types";

/**
 * Organiser gallery (PRD §9.20–9.21; SYSTEM_DESIGN §37–42; API_DESIGN §75–78 +
 * 2026-09-18 notes). Phase 6. All storage goes through getStorageService().
 */
export const photosService = {
  /** READY only; cursor pagination (default 24, max 48) + filtered total. API §75. */
  async list(ctx: MemberContext, query: ListPhotosQuery): Promise<CursorResult<PhotoDto>> {
    return notImplemented("API_DESIGN §75 (Phase 6: Memories)");
  },

  /**
   * Reserve a staging key bound to ctx.weddingId / ctx.membershipId; signed PUT
   * (10 min) pinning Content-Type + Content-Length. Rate limited per member, then
   * per wedding, AFTER validation. API §76.
   */
  async requestUploadUrl(
    ctx: MemberContext,
    input: PhotoUploadRequestInput,
  ): Promise<PhotoUploadUrlDto> {
    return notImplemented("API_DESIGN §76 (Phase 6: Memories)");
  },

  /**
   * Idempotent: match reserved metadata, HEAD length/MIME, 16-byte signature
   * (ETag-pinned), conditional copy to a final key, atomic PENDING → READY. API §77.
   */
  async confirmUpload(ctx: MemberContext, input: ConfirmPhotoUploadInput): Promise<PhotoDto> {
    return notImplemented("API_DESIGN §77 (Phase 6: Memories)");
  },

  /** Signed GET with attachment Content-Disposition; the app never proxies bytes. */
  async getDownloadUrl(ctx: MemberContext, photoId: string): Promise<PhotoDownloadDto> {
    return notImplemented("API_DESIGN 2026-09-18 notes (Phase 6: Memories)");
  },

  /** Delete the R2 object first, then tombstone; storage failure keeps metadata (retryable). API §78. */
  async delete(ctx: MemberContext, photoId: string): Promise<void> {
    return notImplemented("API_DESIGN §78 + 2026-09-18 notes (Phase 6: Memories)");
  },
};
