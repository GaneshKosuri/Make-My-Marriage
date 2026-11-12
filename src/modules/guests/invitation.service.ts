import "server-only";

import type { PublicContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import { getRateLimiter, policies } from "@/server/security/rate-limit";
import { isWellFormedToken } from "@/server/security/tokens";

import { eventsService } from "@/modules/events";
import { weddingsService } from "@/modules/weddings";

import { toPublicInvitationDto } from "./guest.mapper";
import type { GuestRecord } from "./guest.model";
import { guestRepository } from "./guest.repository";
import type { PublicInvitationDto, RsvpResultDto, SubmitRsvpInput } from "./guest.types";

/** Shared counter subject for the global RSVP ceiling (API_DESIGN §51). */
const GLOBAL_RSVP_SUBJECT = "global";

/**
 * The guest behind a link and their (not deleted) wedding. Malformed, unknown
 * and deleted links, and deleted weddings, all look the same: NOT_FOUND.
 */
async function resolve(token: string) {
  if (!isWellFormedToken(token)) throw new AppError("NOT_FOUND");
  const guest = await guestRepository.findByInvitationToken(token);
  if (!guest) throw new AppError("NOT_FOUND");
  const weddingId = guest.weddingId.toString();
  const wedding = await weddingsService.findIdentityWedding(weddingId);
  if (!wedding) throw new AppError("NOT_FOUND");
  return { guest, weddingId, wedding };
}

function toRsvpResult(guest: GuestRecord): RsvpResultDto {
  return {
    status: guest.rsvpStatus,
    attendingCount: guest.attendingCount ?? 0,
    updatedAt: (guest.rsvpUpdatedAt ?? guest.updatedAt).toISOString(),
  };
}

/**
 * Public, token-protected guest invitation and RSVP (PRD §9.9–9.11;
 * SYSTEM_DESIGN §21–23; API_DESIGN §50–51). No accounts.
 */
export const invitationService = {
  /** Only active invited events from the same wedding; minimal projection. API §50. */
  async getPublicInvitation(ctx: PublicContext, token: string): Promise<PublicInvitationDto> {
    const { guest, weddingId, wedding } = await resolve(token);
    const events = await eventsService.listPublicEvents(
      weddingId,
      guest.invitedEventIds.map((id) => id.toString()),
    );
    return toPublicInvitationDto(guest, wedding, events);
  },

  /**
   * One reply for the whole invitation; it can be changed later through the
   * same link (PRD §9.11). Order matters (API §51):
   *   1. resolve the link and wedding, and check the party size
   *      (GUEST_LIMIT_EXCEEDED), so dead links and impossible replies spend
   *      no rate-limit quota;
   *   2. consume the per-invitation counter, then the shared one, even for an
   *      identical repeat;
   *   3. write atomically on the version just read and the current party
   *      size: a party size lowered meanwhile is PARTY_SIZE_CHANGED, any other
   *      concurrent change CONFLICT.
   */
  async submitRsvp(
    ctx: PublicContext,
    token: string,
    input: SubmitRsvpInput,
  ): Promise<RsvpResultDto> {
    const { guest, weddingId } = await resolve(token);
    if (input.attendingCount > guest.maxGuests) {
      throw new AppError("GUEST_LIMIT_EXCEEDED", undefined, {
        details: {
          attendingCount:
            guest.maxGuests === 1
              ? "This invitation is for 1 person."
              : `This invitation is for up to ${guest.maxGuests} people.`,
        },
      });
    }

    await getRateLimiter().enforce([
      { policy: policies.rsvpPerInvitation, subject: token },
      { policy: policies.rsvpGlobal, subject: GLOBAL_RSVP_SUBJECT },
    ]);

    // Saying the same thing again changes nothing (API §102).
    if (guest.rsvpStatus === input.status && guest.attendingCount === input.attendingCount) {
      return toRsvpResult(guest);
    }

    const guestId = guest._id.toString();
    const saved = await guestRepository.saveRsvp(weddingId, guestId, guest.__v, {
      rsvpStatus: input.status,
      attendingCount: input.attendingCount,
      rsvpUpdatedAt: new Date(),
    });
    if (!saved) {
      const latest = await guestRepository.findByInvitationToken(token);
      if (!latest) throw new AppError("NOT_FOUND");
      if (input.attendingCount > latest.maxGuests) throw new AppError("PARTY_SIZE_CHANGED");
      throw new AppError("CONFLICT");
    }
    logger.info("RSVP saved", {
      requestId: ctx.requestId,
      weddingId,
      guestId,
      rsvpStatus: saved.rsvpStatus,
    });
    return toRsvpResult(saved);
  },
};
