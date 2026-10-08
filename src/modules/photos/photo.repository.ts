import "server-only";

import type { CursorPosition } from "@/server/http/pagination";
import { notImplemented } from "@/server/errors";

import type { PhotoDoc, PhotoRecord } from "./photo.model";

/**
 * Data access for `photos`. `weddingId` is ALWAYS the first argument; gallery
 * queries always add `status: "READY"` (2026-09-18 notes).
 */
export const photoRepository = {
  /** READY only; createdAt DESC, _id DESC; fetch `limit + 1` for the next cursor. */
  async listReady(
    weddingId: string,
    filter: { eventId?: string | null },
    page: { after?: CursorPosition; limit: number },
  ): Promise<PhotoRecord[]> {
    return notImplemented("API_DESIGN §75, §79 (Phase 6: Memories)");
  },

  async countReady(weddingId: string, filter: { eventId?: string | null }): Promise<number> {
    return notImplemented("API_DESIGN 2026-09-18 notes (Phase 6: Memories)");
  },

  async findReadyById(weddingId: string, photoId: string): Promise<PhotoRecord | null> {
    return notImplemented("API_DESIGN §78 (Phase 6: Memories)");
  },

  /** Reserve a PENDING row bound to the wedding, uploader and metadata at issuance. */
  async reservePending(
    weddingId: string,
    input: Omit<PhotoDoc, "weddingId" | "status" | "createdAt" | "updatedAt">,
  ): Promise<PhotoRecord> {
    return notImplemented("API_DESIGN §76, §81 (Phase 6: Memories)");
  },

  async findByUploadKey(weddingId: string, uploadKey: string): Promise<PhotoRecord | null> {
    return notImplemented("API_DESIGN §77, §82 (Phase 6: Memories)");
  },

  /** Atomic PENDING → READY with the final key; false when another confirmation won. */
  async publish(weddingId: string, photoId: string, finalObjectKey: string): Promise<boolean> {
    return notImplemented("DATABASE_DESIGN photo lifecycle (Phase 6: Memories)");
  },

  /** After the R2 object is deleted: READY → DELETED tombstone. */
  async markDeleted(weddingId: string, photoId: string): Promise<boolean> {
    return notImplemented("DATABASE_DESIGN photo lifecycle (Phase 6: Memories)");
  },
};
