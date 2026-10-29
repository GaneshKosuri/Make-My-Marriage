/**
 * Member DTOs and inputs (API_DESIGN §21–28). Isomorphic.
 */
import type { z } from "zod";

import type { MemberInvitationStatus, MemberRole } from "./member.constants";
import type { changeMemberRoleSchema, inviteMemberSchema } from "./member.schemas";

/** GET /api/members (API_DESIGN §21). */
export interface MemberDto {
  membershipId: string;
  user: { id: string; name: string; email: string };
  role: MemberRole;
  joinedAt: string;
}

/** POST/GET /api/members/invitations (API_DESIGN §22–23). Never includes the token. */
export interface MemberInvitationDto {
  id: string;
  email: string;
  role: MemberRole;
  status: MemberInvitationStatus;
  expiresAt: string;
}

/** GET /api/public/member-invitations/:token (API_DESIGN §25). Minimal by design. */
export interface PublicMemberInvitationDto {
  email: string;
  role: MemberRole;
  wedding: { brideName: string; groomName: string; weddingDate: string };
  requiresLogin: boolean;
}

/** POST /api/member-invitations/:token/accept (API_DESIGN §26). */
export interface AcceptMemberInvitationResultDto {
  weddingId: string;
  role: MemberRole;
}

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
