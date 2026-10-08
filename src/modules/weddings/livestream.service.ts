import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { LivestreamSettingsDto, UpdateLivestreamInput } from "./wedding.types";

/** YouTube livestream embed (PRD §9.24, SYSTEM_DESIGN §43, API_DESIGN §70–72). Phase 5. */
export const livestreamService = {
  /** API §70. */
  async getSettings(ctx: MemberContext): Promise<LivestreamSettingsDto> {
    return notImplemented("API_DESIGN §70 (Phase 5: Wedding Experience)");
  },

  /** Validate supported YouTube URL formats; `{ youtubeUrl: null, isEnabled: false }` removes it. API §71–72. */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateLivestreamInput,
  ): Promise<LivestreamSettingsDto> {
    return notImplemented("API_DESIGN §71–72 (Phase 5: Wedding Experience)");
  },
};
