import "server-only";

import type { IdentityMembership, IdentityUser, IdentityWedding } from "@/server/auth/identity";
import type { MembershipRole } from "@/server/auth/types";

import type { MemberRole } from "./member.constants";
import type { MemberInvitationRecord } from "./member-invitation.model";
import type { MemberDto, MemberInvitationDto, PublicMemberInvitationDto } from "./member.types";
import type { MembershipRecord } from "./membership.model";

// Compile-time guard: src/server/auth mirrors MEMBER_ROLES (it cannot import modules).
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const rolesInSync: Same<MembershipRole, MemberRole> = true;
void rolesInSync;

/** Document → DTO. Strips secrets (invitation tokenHash) and internals. */
export function toIdentityMembership(membership: MembershipRecord): IdentityMembership {
  return {
    membershipId: membership._id.toString(),
    weddingId: membership.weddingId.toString(),
    role: membership.role,
  };
}

/** API_DESIGN §21. */
export function toMemberDto(membership: MembershipRecord, user: IdentityUser): MemberDto {
  return {
    membershipId: membership._id.toString(),
    user: { id: user.id, name: user.name, email: user.email },
    role: membership.role,
    joinedAt: membership.joinedAt.toISOString(),
  };
}

/** API_DESIGN §22–23. Never the token or its hash. */
export function toMemberInvitationDto(invitation: MemberInvitationRecord): MemberInvitationDto {
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

/**
 * API_DESIGN §25: only what /join/[token] shows. Accepting always needs a
 * signed-in account, so `requiresLogin` is always true; the page knows whether
 * the visitor is signed in already.
 */
export function toPublicMemberInvitationDto(
  invitation: MemberInvitationRecord,
  wedding: IdentityWedding,
): PublicMemberInvitationDto {
  return {
    email: invitation.email,
    role: invitation.role,
    wedding: {
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
    },
    requiresLogin: true,
  };
}
