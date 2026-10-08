import "server-only";

import type { PublicContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { PublicInvitationDto, RsvpResultDto, SubmitRsvpInput } from "./guest.types";

/**
 * Public, token-protected guest invitation and RSVP (PRD §9.9–9.11;
 * SYSTEM_DESIGN §21–23; API_DESIGN §50–51). No accounts. Phase 3.
 *
 * Unknown, malformed or deleted links (and deleted weddings) → generic NOT_FOUND.
 */
export const invitationService = {
  /** Only active invited events from the same wedding; minimal projection. API §50. */
  async getPublicInvitation(ctx: PublicContext, token: string): Promise<PublicInvitationDto> {
    return notImplemented("API_DESIGN §50 (Phase 3: Guests)");
  },

  /**
   * Order matters (API §51): resolve token + owner, validate capacity
   * (GUEST_LIMIT_EXCEEDED / PARTY_SIZE_CHANGED), THEN consume rate limits with
   * `getRateLimiter().enforce([rsvpPerInvitation, rsvpGlobal])`, then an atomic
   * `__v` + capacity conditional write (409 on concurrent edit). Identical
   * repeats are idempotent but still rate limited.
   */
  async submitRsvp(
    ctx: PublicContext,
    token: string,
    input: SubmitRsvpInput,
  ): Promise<RsvpResultDto> {
    return notImplemented("API_DESIGN §51 (Phase 3: Guests)");
  },
};
