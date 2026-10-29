import "server-only";

import { daysUntil } from "@/lib/dates";
import type { IdentityWedding, MemberContext, UserContext } from "@/server/auth";
import { isDuplicateKeyError } from "@/server/db/errors";
import { toObjectId } from "@/server/db/object-id";
import { withTransaction } from "@/server/db/transaction";
import { AppError, notImplemented } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import { generateToken } from "@/server/security/tokens";

import { membersService } from "@/modules/members";

import { DEFAULT_WEBSITE_THEME } from "./wedding.constants";
import { toCreatedWeddingDto, toIdentityWedding, toWeddingDto } from "./wedding.mapper";
import type { WeddingLocation } from "./wedding.model";
import { weddingRepository } from "./wedding.repository";
import { generateUniqueWeddingSlug } from "./wedding.slug";
import type {
  CoverUploadRequestInput,
  CoverUploadUrlDto,
  CreatedWeddingDto,
  CreateWeddingInput,
  UpdateWeddingInput,
  WeddingDto,
} from "./wedding.types";

const SLUG_RACE_ATTEMPTS = 3;

function isDuplicateKeyOn(error: unknown, field: string): boolean {
  if (!isDuplicateKeyError(error)) return false;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern !== undefined && field in keyPattern;
}

/** City is required; a display address is derived when none was given. */
function toLocation(location: CreateWeddingInput["location"]): WeddingLocation {
  const state = location.state || null;
  const country = location.country || null;
  return {
    city: location.city,
    state,
    country,
    formattedAddress:
      location.formattedAddress || [location.city, state, country].filter(Boolean).join(", "),
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    googlePlaceId: location.googlePlaceId || null,
  };
}

/** The wedding workspace itself (PRD §9.2, §9.25; API_DESIGN §17–19, §83). */
export const weddingsService = {
  /**
   * Users without a membership only (ALREADY_HAS_WEDDING). In one transaction:
   * wedding (slug + gallery token generated) + ADMIN membership. API §17.
   */
  async createWedding(ctx: UserContext, input: CreateWeddingInput): Promise<CreatedWeddingDto> {
    // PRD Rule 1: one wedding per user. The unique userId index on memberships
    // is the race-proof guard; this check gives the common case a clean answer.
    if (await membersService.findMembershipForUser(ctx.userId)) {
      throw new AppError("ALREADY_HAS_WEDDING");
    }

    for (let attempt = 1; attempt <= SLUG_RACE_ATTEMPTS; attempt += 1) {
      const slug = await generateUniqueWeddingSlug(input);
      try {
        const wedding = await withTransaction(async (session) => {
          const created = await weddingRepository.create(
            {
              brideName: input.brideName,
              groomName: input.groomName,
              title: input.title || null,
              description: input.description || null,
              weddingDate: input.weddingDate,
              timeZone: input.timeZone,
              coverImageObjectKey: null,
              location: toLocation(input.location),
              website: {
                slug,
                theme: DEFAULT_WEBSITE_THEME,
                isPublished: false,
                welcomeMessage: null,
              },
              gallery: { token: generateToken(), isEnabled: false, guestUploadsEnabled: false },
              livestream: { youtubeUrl: null, isEnabled: false },
              createdByUserId: toObjectId(ctx.userId, "userId"),
            },
            session,
          );
          await membersService.createInitialAdmin(created._id.toString(), ctx.userId, session);
          return created;
        });
        logger.info("Wedding created", {
          requestId: ctx.requestId,
          userId: ctx.userId,
          weddingId: wedding._id.toString(),
        });
        return toCreatedWeddingDto(wedding);
      } catch (error) {
        if (isDuplicateKeyOn(error, "userId")) throw new AppError("ALREADY_HAS_WEDDING");
        // Another wedding took this slug between the check and the insert: try the next one.
        if (isDuplicateKeyOn(error, "website.slug") && attempt < SLUG_RACE_ATTEMPTS) continue;
        throw error;
      }
    }
    throw new Error("Unreachable: slug attempts exhausted");
  },

  /** The caller's wedding (API §18). A soft-deleted wedding is NOT_FOUND. */
  async getWedding(ctx: MemberContext): Promise<WeddingDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");
    return toWeddingDto(wedding);
  },

  /**
   * Admin + Manager; partial; the website address (slug) never changes. A new
   * wedding date must be today or later in the wedding's (new) time zone; an
   * unchanged date is accepted even after the day. API §19.
   */
  async updateWedding(ctx: MemberContext, input: UpdateWeddingInput): Promise<WeddingDto> {
    const wedding = await weddingRepository.findActiveById(ctx.weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");

    const timeZone = input.timeZone ?? wedding.timeZone;
    if (
      input.weddingDate !== undefined &&
      input.weddingDate !== wedding.weddingDate &&
      daysUntil(input.weddingDate, timeZone) < 0
    ) {
      const message = "Choose today or a later date";
      throw new AppError("VALIDATION_ERROR", undefined, { details: { weddingDate: message } });
    }

    const changes: Parameters<typeof weddingRepository.update>[1] = {};
    if (input.brideName !== undefined) changes.brideName = input.brideName;
    if (input.groomName !== undefined) changes.groomName = input.groomName;
    if (input.title !== undefined) changes.title = input.title || null;
    if (input.description !== undefined) changes.description = input.description || null;
    if (input.weddingDate !== undefined) changes.weddingDate = input.weddingDate;
    if (input.timeZone !== undefined) changes.timeZone = input.timeZone;
    if (input.location !== undefined) changes.location = toLocation(input.location);
    if (Object.keys(changes).length === 0) return toWeddingDto(wedding);

    const updated = await weddingRepository.update(ctx.weddingId, changes);
    if (!updated) throw new AppError("NOT_FOUND");
    logger.info("Wedding details updated", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      fields: Object.keys(changes),
    });
    return toWeddingDto(updated);
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
