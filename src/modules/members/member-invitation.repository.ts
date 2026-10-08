import "server-only";

import type { ClientSession } from "mongoose";

import { notImplemented } from "@/server/errors";

import type { MemberRole } from "./member.constants";
import type { MemberInvitationRecord } from "./member-invitation.model";

/** Data access for `wedding_member_invitations` (DATABASE_DESIGN §28–30). */
export const memberInvitationRepository = {
  async create(
    weddingId: string,
    input: {
      email: string;
      emailNormalized: string;
      role: MemberRole;
      tokenHash: string;
      invitedByUserId: string;
      expiresAt: Date;
    },
  ): Promise<MemberInvitationRecord> {
    return notImplemented("API_DESIGN §22 (Phase 1: Foundation)");
  },

  async listPending(weddingId: string): Promise<MemberInvitationRecord[]> {
    return notImplemented("API_DESIGN §23 (Phase 1: Foundation)");
  },

  async revoke(weddingId: string, invitationId: string): Promise<boolean> {
    return notImplemented("API_DESIGN §24 (Phase 1: Foundation)");
  },

  /** Token resolution — a sanctioned tenant-guard opt-out (no weddingId yet). */
  async findByTokenHash(tokenHash: string): Promise<MemberInvitationRecord | null> {
    return notImplemented("API_DESIGN §25–26 (Phase 1: Foundation)");
  },

  /** PENDING → ACCEPTED, conditional on status, inside the accept transaction. */
  async markAccepted(
    weddingId: string,
    invitationId: string,
    acceptedByUserId: string,
    session: ClientSession,
  ): Promise<boolean> {
    return notImplemented("DATABASE_DESIGN §86 (Phase 1: Foundation)");
  },
};
