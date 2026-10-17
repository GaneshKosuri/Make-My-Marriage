import "server-only";

import type { IdentityPorts } from "@/server/auth/identity";

import { weddingsService } from "@/modules/weddings";

import { toIdentityUser } from "./auth.mapper";
import { sessionRepository } from "./session.repository";
import { userRepository } from "./user.repository";
import { findWeddingContext } from "./wedding-context";

/**
 * Implements the identity ports declared in src/server/auth/identity.ts.
 * Wired once by src/composition-root.ts.
 */
export const identityPorts: IdentityPorts = {
  sessions: sessionRepository,
  directory: {
    async findUserById(userId) {
      const user = await userRepository.findById(userId);
      return user ? toIdentityUser(user) : null;
    },

    async findMembershipByUserId(userId) {
      return (await findWeddingContext(userId))?.membership ?? null;
    },

    async findWeddingById(weddingId) {
      return weddingsService.findIdentityWedding(weddingId);
    },
  },
};
