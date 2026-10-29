import "server-only";

import type { ClientSession } from "mongoose";

import type { IdentityMembership, MemberContext } from "@/server/auth";
import { AppError, notImplemented } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { MemberRole } from "./member.constants";
import { loadUsers } from "./member-directory";
import { toIdentityMembership, toMemberDto } from "./member.mapper";
import type { ChangeMemberRoleInput, MemberDto } from "./member.types";
import type { MembershipRecord } from "./membership.model";
import { membershipRepository } from "./membership.repository";

/**
 * Guards the "at least one Admin" rule (DATABASE_DESIGN §27) without a
 * transaction (binding rule: transactions only for create wedding and accept
 * invitation). Check first for the common case; after the write, check again
 * and undo it if two Admins demoted or removed each other at the same moment.
 */
async function assertAnotherAdminRemains(weddingId: string): Promise<void> {
  if ((await membershipRepository.countAdmins(weddingId)) <= 1) throw new AppError("LAST_ADMIN");
}

async function noAdminLeft(weddingId: string): Promise<boolean> {
  return (await membershipRepository.countAdmins(weddingId)) === 0;
}

async function findInWedding(weddingId: string, membershipId: string): Promise<MembershipRecord> {
  const membership = await membershipRepository.findById(weddingId, membershipId);
  if (!membership) throw new AppError("NOT_FOUND");
  return membership;
}

async function toMemberDtos(memberships: readonly MembershipRecord[]): Promise<MemberDto[]> {
  const users = await loadUsers(memberships.map((membership) => membership.userId.toString()));
  return memberships.flatMap((membership) => {
    const user = users.get(membership.userId.toString());
    return user ? [toMemberDto(membership, user)] : [];
  });
}

/**
 * Wedding Member management (PRD §9.4, SYSTEM_DESIGN §13–20, API_DESIGN §21, §27–28).
 * Admin-only mutations are enforced by `route({ auth: "admin" })`; the service
 * still guards business rules (never zero Admins → LAST_ADMIN).
 */
export const membersService = {
  /** Admins and Managers can view members. API §21. */
  async listMembers(ctx: MemberContext): Promise<MemberDto[]> {
    return toMemberDtos(await membershipRepository.listByWedding(ctx.weddingId));
  },

  /** ADMIN ⇄ MANAGER; the wedding must keep ≥ 1 Admin (LAST_ADMIN). API §27. */
  async changeRole(
    ctx: MemberContext,
    membershipId: string,
    input: ChangeMemberRoleInput,
  ): Promise<MemberDto> {
    const membership = await findInWedding(ctx.weddingId, membershipId);
    let updated = membership;

    if (membership.role !== input.role) {
      const demotingAdmin = membership.role === "ADMIN";
      if (demotingAdmin) await assertAnotherAdminRemains(ctx.weddingId);

      const result = await membershipRepository.updateRole(ctx.weddingId, membershipId, input.role);
      if (!result) throw new AppError("NOT_FOUND");
      if (demotingAdmin && (await noAdminLeft(ctx.weddingId))) {
        await membershipRepository.updateRole(ctx.weddingId, membershipId, "ADMIN");
        throw new AppError("LAST_ADMIN");
      }
      updated = result;
      logger.info("Member role changed", {
        requestId: ctx.requestId,
        weddingId: ctx.weddingId,
        membershipId,
        role: input.role,
      });
    }

    const [dto] = await toMemberDtos([updated]);
    if (!dto) throw new AppError("NOT_FOUND");
    return dto;
  },

  /** Hard delete; access ends immediately; LAST_ADMIN guard. API §28. */
  async removeMember(ctx: MemberContext, membershipId: string): Promise<void> {
    const membership = await findInWedding(ctx.weddingId, membershipId);
    const removingAdmin = membership.role === "ADMIN";
    if (removingAdmin) await assertAnotherAdminRemains(ctx.weddingId);

    if (!(await membershipRepository.delete(ctx.weddingId, membershipId))) {
      throw new AppError("NOT_FOUND");
    }
    if (removingAdmin && (await noAdminLeft(ctx.weddingId))) {
      await membershipRepository.restore(ctx.weddingId, membership);
      throw new AppError("LAST_ADMIN");
    }
    // TODO(Phase 2): unassign the removed member's tasks (Task.assignedMembershipId).
    logger.info("Member removed", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      membershipId,
    });
  },

  // ── Cross-module operations (call through @/modules/members) ────────────

  /** Identity resolution: the user's membership, if any. */
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
    const users = await loadUsers(memberships.map((membership) => membership.userId.toString()));
    return new Map(
      memberships.flatMap((membership) => {
        const user = users.get(membership.userId.toString());
        if (!user) return [];
        const membershipId = membership._id.toString();
        return [[membershipId, { membershipId, name: user.name, role: membership.role }]];
      }),
    );
  },

  /** Dashboard "Invite a family member" step: how many people plan this wedding. */
  async countMembers(weddingId: string): Promise<number> {
    return membershipRepository.countByWedding(weddingId);
  },
};
