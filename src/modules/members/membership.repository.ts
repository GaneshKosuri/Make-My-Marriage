import "server-only";

import type { ClientSession } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { TENANT_SCOPED_OPTION } from "@/server/db/plugins/tenant-guard";
import { notImplemented } from "@/server/errors";

import type { MemberRole } from "./member.constants";
import { MembershipModel, type MembershipRecord } from "./membership.model";

/**
 * Data access for `wedding_memberships`. Every function takes `weddingId`
 * first, except identity resolution, which is how a request discovers its
 * weddingId in the first place.
 */
export const membershipRepository = {
  /**
   * Identity resolution (session → membership). Implemented now. One of the
   * few sanctioned tenant-guard opt-outs: there is no weddingId yet.
   */
  async findByUserIdForIdentity(userId: string): Promise<MembershipRecord | null> {
    await connectToDatabase();
    return MembershipModel.findOne({ userId: toObjectId(userId, "userId") })
      .setOptions({ [TENANT_SCOPED_OPTION]: false })
      .lean<MembershipRecord>()
      .exec();
  },

  async listByWedding(weddingId: string): Promise<MembershipRecord[]> {
    return notImplemented("API_DESIGN §21 (Phase 1: Foundation)");
  },

  async findById(weddingId: string, membershipId: string): Promise<MembershipRecord | null> {
    return notImplemented("API_DESIGN §27–28 (Phase 1: Foundation)");
  },

  async countAdmins(weddingId: string, session?: ClientSession): Promise<number> {
    return notImplemented("DATABASE_DESIGN §27 (Phase 1: Foundation)");
  },

  async create(
    weddingId: string,
    input: { userId: string; role: MemberRole },
    session?: ClientSession,
  ): Promise<MembershipRecord> {
    return notImplemented("DATABASE_DESIGN §85–86 (Phase 1: Foundation)");
  },

  async updateRole(
    weddingId: string,
    membershipId: string,
    role: MemberRole,
  ): Promise<MembershipRecord | null> {
    return notImplemented("API_DESIGN §27 (Phase 1: Foundation)");
  },

  async delete(weddingId: string, membershipId: string): Promise<boolean> {
    return notImplemented("API_DESIGN §28 (Phase 1: Foundation)");
  },
};
