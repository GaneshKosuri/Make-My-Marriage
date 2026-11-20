import "server-only";

import type { MemberContext } from "@/server/auth";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { WeddingRecord } from "./wedding.model";
import { weddingRepository } from "./wedding.repository";
import type { GalleryQrDto, GallerySettingsDto, UpdateGallerySettingsInput } from "./wedding.types";

/** Resolved by a gallery token; consumed by the photos module. */
export interface GalleryAccess {
  weddingId: string;
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
  brideName: string;
  groomName: string;
  weddingDate: string;
  timeZone: string;
}

/** The stable guest gallery link (and printed QR target), from NEXT_PUBLIC_APP_URL. */
function galleryUrlFor(token: string): string {
  return new URL(`/gallery/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
}

async function requireGalleryUrl(weddingId: string): Promise<string> {
  const token = await weddingRepository.getGalleryToken(weddingId);
  if (!token) throw new AppError("NOT_FOUND");
  return galleryUrlFor(token);
}

function toSettings(
  wedding: Pick<WeddingRecord, "gallery">,
  galleryUrl: string,
): GallerySettingsDto {
  return {
    isEnabled: wedding.gallery.isEnabled,
    guestUploadsEnabled: wedding.gallery.guestUploadsEnabled,
    galleryUrl,
    qrUrl: galleryUrl,
  };
}

/**
 * Gallery configuration embedded in Wedding (PRD §9.20, §9.23; SYSTEM_DESIGN §24–25;
 * API_DESIGN §73–74, §84). Share URLs use NEXT_PUBLIC_APP_URL, never the Host
 * header, and are never logged. Both switches start off (binding decision 13).
 */
export const gallerySettingsService = {
  /** API §73: the switches and the stable gallery link (also the QR target). */
  async getSettings(ctx: MemberContext): Promise<GallerySettingsDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toSettings(wedding, await requireGalleryUrl(ctx.weddingId));
  },

  /** API §74. Any member may change them; the link stays the same. */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateGallerySettingsInput,
  ): Promise<GallerySettingsDto> {
    const wedding = await weddingRepository.updateGallery(ctx.weddingId, input);
    if (!wedding) throw new AppError("NOT_FOUND");
    logger.info("Gallery settings changed", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      isEnabled: wedding.gallery.isEnabled,
      guestUploadsEnabled: wedding.gallery.guestUploadsEnabled,
    });
    return toSettings(wedding, await requireGalleryUrl(ctx.weddingId));
  },

  /** Option A: return the URL; the browser draws the QR. API §84. */
  async getQr(ctx: MemberContext): Promise<GalleryQrDto> {
    return { galleryUrl: await requireGalleryUrl(ctx.weddingId) };
  },

  /** Token → wedding (token resolution). Null for unknown or deleted weddings. */
  async resolveGalleryToken(token: string): Promise<GalleryAccess | null> {
    const wedding = await weddingRepository.findByGalleryToken(token);
    if (!wedding) return null;
    return {
      weddingId: wedding._id.toString(),
      isEnabled: wedding.gallery.isEnabled,
      guestUploadsEnabled: wedding.gallery.guestUploadsEnabled,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
      timeZone: wedding.timeZone,
    };
  },
};
