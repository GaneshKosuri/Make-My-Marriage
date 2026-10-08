import "server-only";

import type { IdentityWedding, MemberContext, UserContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import { toIdentityWedding } from "./wedding.mapper";
import { weddingRepository } from "./wedding.repository";
import type {
  CoverUploadRequestInput,
  CoverUploadUrlDto,
  CreatedWeddingDto,
  CreateWeddingInput,
  UpdateWeddingInput,
  WeddingDto,
} from "./wedding.types";

/** The wedding workspace itself (PRD §9.2, §9.25; API_DESIGN §17–19, §83). */
export const weddingsService = {
  /**
   * Users without a membership only (ALREADY_HAS_WEDDING). In one transaction:
   * wedding (slug + gallery token generated) + ADMIN membership. API §17.
   */
  async createWedding(ctx: UserContext, input: CreateWeddingInput): Promise<CreatedWeddingDto> {
    return notImplemented("API_DESIGN §17, DATABASE_DESIGN §85 (Phase 1: Foundation)");
  },

  /** API §18. */
  async getWedding(ctx: MemberContext): Promise<WeddingDto> {
    return notImplemented("API_DESIGN §18 (Phase 1: Foundation)");
  },

  /** Admin + Manager; partial; slug unchanged. API §19. */
  async updateWedding(ctx: MemberContext, input: UpdateWeddingInput): Promise<WeddingDto> {
    return notImplemented("API_DESIGN §19 (Phase 1: Foundation)");
  },

  /** Direct-to-R2 cover upload; then PATCH coverImageObjectKey. API §83. */
  async requestCoverUploadUrl(
    ctx: MemberContext,
    input: CoverUploadRequestInput,
  ): Promise<CoverUploadUrlDto> {
    return notImplemented("API_DESIGN §83 (Phase 5: Wedding Experience)");
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Identity resolution / couple header. Null when missing or soft-deleted. Implemented now. */
  async findIdentityWedding(weddingId: string): Promise<IdentityWedding | null> {
    const wedding = await weddingRepository.findActiveById(weddingId);
    return wedding ? toIdentityWedding(wedding) : null;
  },
};
