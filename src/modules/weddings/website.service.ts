import "server-only";

import type { MemberContext, PublicContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  PublicWeddingDto,
  UpdateWebsiteSettingsInput,
  WebsiteSettingsDto,
} from "./wedding.types";

/** Wedding website (PRD §9.18–9.19, SYSTEM_DESIGN §26–28, API_DESIGN §67–69). Phase 5. */
export const websiteService = {
  /** API §67. */
  async getSettings(ctx: MemberContext): Promise<WebsiteSettingsDto> {
    return notImplemented("API_DESIGN §67 (Phase 5: Wedding Experience)");
  },

  /** Theme, welcome message, publish flag. Slug is never editable. API §68. */
  async updateSettings(
    ctx: MemberContext,
    input: UpdateWebsiteSettingsInput,
  ): Promise<WebsiteSettingsDto> {
    return notImplemented("API_DESIGN §68 (Phase 5: Wedding Experience)");
  },

  /**
   * Public, intentionally published data only; unpublished/deleted → NOT_FOUND
   * (API §69). Also used directly by the /w/[slug] Server Component (rule 5).
   */
  async getPublicWebsite(ctx: PublicContext, slug: string): Promise<PublicWeddingDto> {
    return notImplemented("API_DESIGN §69 (Phase 5: Wedding Experience)");
  },
};
