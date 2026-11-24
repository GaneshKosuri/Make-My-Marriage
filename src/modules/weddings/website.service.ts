import "server-only";

import { coupleDisplayName, weddingPlace } from "@/lib/couple";
import { youTubeEmbedUrl, youTubeVideoId } from "@/lib/youtube";
import type { MemberContext, PublicContext } from "@/server/auth";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import { eventsService } from "@/modules/events";

import { coverUrl, publishCover, removeCoverObject } from "./cover";
import { websiteUrlFor } from "./wedding.mapper";
import type { WeddingRecord } from "./wedding.model";
import { weddingRepository } from "./wedding.repository";
import type {
  PublicWeddingDto,
  UpdateWebsiteSettingsInput,
  WebsiteSettingsDto,
} from "./wedding.types";

async function toSettings(wedding: WeddingRecord): Promise<WebsiteSettingsDto> {
  return {
    slug: wedding.website.slug,
    theme: wedding.website.theme,
    isPublished: wedding.website.isPublished,
    welcomeMessage: wedding.website.welcomeMessage ?? null,
    showGallery: wedding.website.showGallery ?? false,
    url: websiteUrlFor(wedding.website.slug),
    coverImageUrl: await coverUrl(wedding.coverImageObjectKey ?? null),
  };
}

/** The gallery button's link: only when the gallery is on and the family shows it. */
async function galleryLink(wedding: WeddingRecord): Promise<string | null> {
  if (!wedding.gallery.isEnabled || !wedding.website.showGallery) return null;
  const token = await weddingRepository.getGalleryToken(wedding._id.toString());
  return token ? new URL(`/gallery/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString() : null;
}

/** The one DTO every theme renders (SYSTEM_DESIGN §28). */
async function toPublicWedding(wedding: WeddingRecord): Promise<PublicWeddingDto> {
  const weddingId = wedding._id.toString();
  const [events, gallery, cover] = await Promise.all([
    eventsService.listWebsiteEvents(weddingId),
    galleryLink(wedding),
    coverUrl(wedding.coverImageObjectKey ?? null),
  ]);
  const videoId = wedding.livestream?.youtubeUrl
    ? youTubeVideoId(wedding.livestream.youtubeUrl)
    : null;
  const livestreamOn = Boolean(wedding.livestream?.isEnabled && videoId);
  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title?.trim() || coupleDisplayName(wedding),
    description: wedding.description ?? null,
    welcomeMessage: wedding.website.welcomeMessage ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    place: weddingPlace({
      city: wedding.location?.city ?? null,
      state: wedding.location?.state ?? null,
    }),
    coverImageUrl: cover,
    theme: wedding.website.theme,
    events,
    gallery: { enabled: gallery !== null, url: gallery },
    livestream: {
      enabled: livestreamOn,
      youtubeUrl: livestreamOn ? (wedding.livestream.youtubeUrl ?? null) : null,
      embedUrl: livestreamOn && videoId ? youTubeEmbedUrl(videoId) : null,
    },
  };
}

/** Wedding website (PRD §9.18–9.19, SYSTEM_DESIGN §26–28, API_DESIGN §67–69). Phase 5. */
export const websiteService = {
  /** API §67, plus the gallery switch and the website's address. */
  async getSettings(ctx: MemberContext): Promise<WebsiteSettingsDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toSettings(wedding);
  },

  /** Theme, welcome message, publish flag, gallery button. The slug is never editable. API §68. */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateWebsiteSettingsInput,
  ): Promise<WebsiteSettingsDto> {
    const { coverImageObjectKey, ...website } = input;
    let wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    // The cover first: a bad upload changes nothing else (API §83).
    if (coverImageObjectKey !== undefined) {
      const previous = wedding.coverImageObjectKey ?? null;
      const next =
        coverImageObjectKey === null
          ? null
          : await publishCover(ctx.weddingId, coverImageObjectKey);
      wedding = await weddingRepository.setCover(ctx.weddingId, next);
      if (!wedding) throw new AppError("NOT_FOUND");
      if (previous && previous !== next) await removeCoverObject(previous);
      logger.info(next ? "Cover photo set" : "Cover photo removed", {
        requestId: ctx.requestId,
        weddingId: ctx.weddingId,
      });
    }
    if (Object.values(website).some((value) => value !== undefined)) {
      wedding = await weddingRepository.updateWebsite(ctx.weddingId, website);
      if (!wedding) throw new AppError("NOT_FOUND");
    }
    logger.info("Website settings changed", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      theme: wedding.website.theme,
      isPublished: wedding.website.isPublished,
    });
    return toSettings(wedding);
  },

  /**
   * Public, intentionally published data only; unpublished or deleted ->
   * NOT_FOUND, so a link never reveals an unpublished wedding (API §69). Also
   * used directly by the /w/[slug] page.
   */
  async getPublicWebsite(_ctx: PublicContext, slug: string): Promise<PublicWeddingDto> {
    const wedding = await weddingRepository.findPublishedBySlug(slug);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toPublicWedding(wedding);
  },

  /** The same website for the family, published or not (the members-only preview). */
  async getPreview(ctx: MemberContext): Promise<PublicWeddingDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toPublicWedding(wedding);
  },
};
