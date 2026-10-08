import "server-only";

import type { MemberContext, PublicContext, UserContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  AcceptMemberInvitationResultDto,
  InviteMemberInput,
  MemberInvitationDto,
  PublicMemberInvitationDto,
} from "./member.types";

/**
 * Member invitations (SYSTEM_DESIGN §18–20, DATABASE_DESIGN §28–30, API_DESIGN §22–26).
 * Tokens: generateToken() → HMAC("member-invite") stored; raw token only in the email link (/join/[token]).
 */
export const memberInvitationService = {
  /** Admin only: not already a member, no duplicate pending invite, email immediately. API §22. */
  async invite(ctx: MemberContext, input: InviteMemberInput): Promise<MemberInvitationDto> {
    return notImplemented("API_DESIGN §22 (Phase 1: Foundation)");
  },

  /** Admin only. API §23. */
  async listPending(ctx: MemberContext): Promise<MemberInvitationDto[]> {
    return notImplemented("API_DESIGN §23 (Phase 1: Foundation)");
  },

  /** Admin only: status → REVOKED. API §24. */
  async revoke(ctx: MemberContext, invitationId: string): Promise<void> {
    return notImplemented("API_DESIGN §24 (Phase 1: Foundation)");
  },

  /** Public: just enough to render /join/[token]. API §25. */
  async getPublicInvitation(ctx: PublicContext, token: string): Promise<PublicMemberInvitationDto> {
    return notImplemented("API_DESIGN §25 (Phase 1: Foundation)");
  },

  /**
   * Signed-in user accepts: email must match (INVITATION_EMAIL_MISMATCH), no existing
   * membership (ALREADY_HAS_WEDDING), then membership + ACCEPTED in one transaction. API §26.
   */
  async accept(ctx: UserContext, token: string): Promise<AcceptMemberInvitationResultDto> {
    return notImplemented("API_DESIGN §26, DATABASE_DESIGN §86 (Phase 1: Foundation)");
  },
};
