import "server-only";

import type { ClientSession } from "mongoose";

import { getIdentity, type IdentityMembership, type MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { MemberRole } from "./member.constants";
import { toIdentityMembership } from "./member.mapper";
import type { ChangeMemberRoleInput, MemberDto } from "./member.types";
import { membershipRepository } from "./membership.repository";

/**
 * Wedding Member management (PRD §9.4, SYSTEM_DESIGN §13–20, API_DESIGN §21, §27–28).
 * Admin-only mutations are enforced by `route({ auth: "admin" })`; the service
 * still guards business rules (never zero Admins → LAST_ADMIN).
 */
export const membersService = {
  /** Admins and Managers can view members. API §21. */
  async listMembers(ctx: MemberContext): Promise<MemberDto[]> {
    return notImplemented("API_DESIGN §21 (Phase 1: Foundation)");
  },

  /** ADMIN ⇄ MANAGER; the wedding must keep ≥ 1 Admin (LAST_ADMIN). API §27. */
  async changeRole(
    ctx: MemberContext,
    membershipId: string,
    input: ChangeMemberRoleInput,
  ): Promise<MemberDto> {
    return notImplemented("API_DESIGN §27 (Phase 1: Foundation)");
  },

  /** Hard delete; access ends immediately; LAST_ADMIN guard. API §28. */
  async removeMember(ctx: MemberContext, membershipId: string): Promise<void> {
    return notImplemented("API_DESIGN §28 (Phase 1: Foundation)");
  },

  // ── Cross-module operations (call through @/modules/members) ────────────

  /** Identity resolution: the user's membership, if any. Implemented now. */
  async findMembershipForUser(userId: string): Promise<IdentityMembership | null> {
    const membership = await membershipRepository.findByUserIdForIdentity(userId);
    return membership ? toIdentityMembership(membership) : null;
  },

  /** Inside the create-wedding transaction (DATABASE_DESIGN §85). */
  async createInitialAdmin(
    weddingId: string,
    userId: string,
    session: ClientSession,
  ): Promise<void> {
    await membershipRepository.create(weddingId, { userId, role: "ADMIN" }, session);
  },

  /** Tasks/expenses: a referenced membership must belong to this wedding (DATABASE_DESIGN §38). */
  async assertMembershipInWedding(weddingId: string, membershipId: string): Promise<void> {
    return notImplemented("DATABASE_DESIGN §38, §57 (Phase 2: Planning)");
  },

  /** Display summaries for task assignees (API_DESIGN §34 notes: name + role, no email). */
  async findMemberSummaries(
    weddingId: string,
    membershipIds: readonly string[],
  ): Promise<Map<string, { membershipId: string; name: string; role: MemberRole }>> {
    const memberships = await membershipRepository.findByIds(weddingId, [
      ...new Set(membershipIds),
    ]);
    // Names come from the identity directory (users belong to the auth module).
    const { directory } = getIdentity();
    const summaries = await Promise.all(
      memberships.map(async (membership) => {
        const user = await directory.findUserById(membership.userId.toString());
        return user
          ? { membershipId: membership._id.toString(), name: user.name, role: membership.role }
          : null;
      }),
    );
    return new Map(
      summaries
        .filter((summary) => summary !== null)
        .map((summary) => [summary.membershipId, summary]),
    );
  },

  /** Dashboard "Invite a family member" step: how many people plan this wedding. */
  async countMembers(weddingId: string): Promise<number> {
    return membershipRepository.countByWedding(weddingId);
  },
};
