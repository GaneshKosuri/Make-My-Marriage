/**
 * Member DTOs and inputs (API_DESIGN §21–28). Isomorphic.
 * TODO(Phase 1): derive inputs from ./member.schemas.ts with z.infer.
 */
import type { MemberInvitationStatus, MemberRole } from "./member.constants";

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

export interface InviteMemberInput {
  email: string;
  role: MemberRole;
}

export interface ChangeMemberRoleInput {
  role: MemberRole;
}
