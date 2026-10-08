import "server-only";

import type { IdentityPorts } from "@/server/auth/identity";

import { membersService } from "@/modules/members";
import { weddingsService } from "@/modules/weddings";

import { toIdentityUser } from "./auth.mapper";
import { sessionRepository } from "./session.repository";
import { userRepository } from "./user.repository";

/**
 * Implements the identity ports declared in src/server/auth/identity.ts.
 * Wired once by src/composition-root.ts. Cross-module data comes through the
 * members and weddings public APIs (dependency rule 2).
 */
export const identityPorts: IdentityPorts = {
  sessions: sessionRepository,
  directory: {
    async findUserById(userId) {
      const user = await userRepository.findById(userId);
      return user ? toIdentityUser(user) : null;
    },

    async findMembershipByUserId(userId) {
      const membership = await membersService.findMembershipForUser(userId);
      if (!membership) return null;
      // A soft-deleted wedding grants no access (DATABASE_DESIGN §93).
      const wedding = await weddingsService.findIdentityWedding(membership.weddingId);
      return wedding ? membership : null;
    },

    async findWeddingById(weddingId) {
      return weddingsService.findIdentityWedding(weddingId);
    },
  },
};
