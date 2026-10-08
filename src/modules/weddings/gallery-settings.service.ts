import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { GalleryQrDto, GallerySettingsDto, UpdateGallerySettingsInput } from "./wedding.types";

/** Resolved by a gallery token; consumed by the photos module. */
export interface GalleryAccess {
  weddingId: string;
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
}

/**
 * Gallery configuration embedded in Wedding (PRD §9.20, §9.23; SYSTEM_DESIGN §24–25;
 * API_DESIGN §73–74, §84). Share URLs use NEXT_PUBLIC_APP_URL, never the Host header. Phase 6.
 */
export const gallerySettingsService = {
  /** API §73: includes the stable galleryUrl (QR target). */
  async getSettings(ctx: MemberContext): Promise<GallerySettingsDto> {
    return notImplemented("API_DESIGN §73 (Phase 6: Memories)");
  },

  /** API §74. */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateGallerySettingsInput,
  ): Promise<GallerySettingsDto> {
    return notImplemented("API_DESIGN §74 (Phase 6: Memories)");
  },

  /** Option A: return the URL; the browser renders the QR. API §84. */
  async getQr(ctx: MemberContext): Promise<GalleryQrDto> {
    return notImplemented("API_DESIGN §84 (Phase 6: Memories)");
  },

  /** Token → wedding (token resolution; tenant-guard opt-out). Null for unknown/deleted. */
  async resolveGalleryToken(token: string): Promise<GalleryAccess | null> {
    return notImplemented("API_DESIGN §79–82 (Phase 6: Memories)");
  },
};
