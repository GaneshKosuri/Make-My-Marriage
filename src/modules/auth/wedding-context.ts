import "server-only";

import type { IdentityMembership, IdentityWedding } from "@/server/auth/identity";

import { membersService } from "@/modules/members";
import { weddingsService } from "@/modules/weddings";

export interface WeddingContext {
  membership: IdentityMembership;
  wedding: IdentityWedding;
}

/**
 * The user's membership and wedding, or null when they have none. A
 * soft-deleted wedding grants no access (DATABASE_DESIGN §93), so it counts as none.
 * Cross-module data comes through the members and weddings public APIs.
 */
export async function findWeddingContext(userId: string): Promise<WeddingContext | null> {
  const membership = await membersService.findMembershipForUser(userId);
  if (!membership) return null;
  const wedding = await weddingsService.findIdentityWedding(membership.weddingId);
  return wedding ? { membership, wedding } : null;
}
