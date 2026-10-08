import "server-only";

import type { IdentityMembership } from "@/server/auth/identity";
import type { MembershipRole } from "@/server/auth/types";

import type { MemberRole } from "./member.constants";
import type { MembershipRecord } from "./membership.model";

// Compile-time guard: src/server/auth mirrors MEMBER_ROLES (it cannot import modules).
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const rolesInSync: Same<MembershipRole, MemberRole> = true;
void rolesInSync;

/**
 * Document → DTO. Strips secrets (invitation tokenHash) and internals.
 * TODO(Phase 1): toMemberDto, toMemberInvitationDto, toPublicMemberInvitationDto (API_DESIGN §21–26).
 */
export function toIdentityMembership(membership: MembershipRecord): IdentityMembership {
  return {
    membershipId: membership._id.toString(),
    weddingId: membership.weddingId.toString(),
    role: membership.role,
  };
}
