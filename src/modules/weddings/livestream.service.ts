import "server-only";

import { youTubeEmbedUrl, youTubeVideoId } from "@/lib/youtube";
import type { MemberContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { WeddingRecord } from "./wedding.model";
import { weddingRepository } from "./wedding.repository";
import type { LivestreamSettingsDto, UpdateLivestreamInput } from "./wedding.types";

const NEEDS_LINK = "Add the YouTube link first";

function toSettings(wedding: WeddingRecord): LivestreamSettingsDto {
  const youtubeUrl = wedding.livestream?.youtubeUrl ?? null;
  const videoId = youtubeUrl ? youTubeVideoId(youtubeUrl) : null;
  return {
    youtubeUrl,
    isEnabled: wedding.livestream?.isEnabled ?? false,
    embedUrl: videoId ? youTubeEmbedUrl(videoId) : null,
  };
}

/** YouTube livestream embed (PRD §9.24, SYSTEM_DESIGN §43, API_DESIGN §70–72). Phase 5. */
export const livestreamService = {
  /** API §70: the link, the switch and the player link. */
  async getSettings(ctx: MemberContext): Promise<LivestreamSettingsDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toSettings(wedding);
  },

  /**
   * Add, change or remove the link and switch it on or off (API §71–72).
   * Removing the link (`youtubeUrl: null`) also switches it off; switching on
   * needs a link.
   */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateLivestreamInput,
  ): Promise<LivestreamSettingsDto> {
    const current = await weddingRepository.findActiveById(ctx.weddingId);
    if (!current) throw new AppError("NOT_FOUND");
    const youtubeUrl =
      input.youtubeUrl !== undefined ? input.youtubeUrl : (current.livestream?.youtubeUrl ?? null);
    const isEnabled =
      youtubeUrl === null ? false : (input.isEnabled ?? current.livestream?.isEnabled ?? false);
    if (input.isEnabled && youtubeUrl === null) {
      throw new AppError("VALIDATION_ERROR", undefined, { details: { isEnabled: NEEDS_LINK } });
    }

    const wedding = await weddingRepository.updateLivestream(ctx.weddingId, {
      youtubeUrl,
      isEnabled,
    });
    if (!wedding) throw new AppError("NOT_FOUND");
    logger.info("Livestream changed", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      hasLink: youtubeUrl !== null,
      isEnabled,
    });
    return toSettings(wedding);
  },
};
