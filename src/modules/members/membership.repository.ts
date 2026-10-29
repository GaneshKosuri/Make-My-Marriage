import "server-only";

import type { ClientSession } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { TENANT_SCOPED_OPTION } from "@/server/db/plugins/tenant-guard";

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

  /** Oldest first, so the couple who created the wedding lead the list. */
  async listByWedding(weddingId: string): Promise<MembershipRecord[]> {
    await connectToDatabase();
    return MembershipModel.find({ weddingId: toObjectId(weddingId, "weddingId") })
      .sort({ joinedAt: 1, _id: 1 })
      .lean<MembershipRecord[]>()
      .exec();
  },

  async findById(weddingId: string, membershipId: string): Promise<MembershipRecord | null> {
    await connectToDatabase();
    return MembershipModel.findOne({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: toObjectId(membershipId, "membershipId"),
    })
      .lean<MembershipRecord>()
      .exec();
  },

  async findByIds(
    weddingId: string,
    membershipIds: readonly string[],
  ): Promise<MembershipRecord[]> {
    if (membershipIds.length === 0) return [];
    await connectToDatabase();
    return MembershipModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: { $in: membershipIds.map((id) => toObjectId(id, "membershipId")) },
    })
      .lean<MembershipRecord[]>()
      .exec();
  },

  async countByWedding(weddingId: string): Promise<number> {
    await connectToDatabase();
    return MembershipModel.countDocuments({ weddingId: toObjectId(weddingId, "weddingId") }).exec();
  },

  async countAdmins(weddingId: string): Promise<number> {
    await connectToDatabase();
    return MembershipModel.countDocuments({
      weddingId: toObjectId(weddingId, "weddingId"),
      role: "ADMIN",
    }).exec();
  },

  async create(
    weddingId: string,
    input: { userId: string; role: MemberRole },
    session?: ClientSession,
  ): Promise<MembershipRecord> {
    await connectToDatabase();
    const [doc] = await MembershipModel.create(
      [
        {
          weddingId: toObjectId(weddingId, "weddingId"),
          userId: toObjectId(input.userId, "userId"),
          role: input.role,
        },
      ],
      { session },
    );
    if (!doc) throw new Error("Membership was not created");
    return doc.toObject() as MembershipRecord;
  },

  /** Puts back a membership exactly as it was (undoing a removal that left no Admin). */
  async restore(weddingId: string, membership: MembershipRecord): Promise<void> {
    await connectToDatabase();
    await MembershipModel.create({
      _id: membership._id,
      weddingId: toObjectId(weddingId, "weddingId"),
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.joinedAt,
    });
  },

  async updateRole(
    weddingId: string,
    membershipId: string,
    role: MemberRole,
  ): Promise<MembershipRecord | null> {
    await connectToDatabase();
    return MembershipModel.findOneAndUpdate(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        _id: toObjectId(membershipId, "membershipId"),
      },
      { $set: { role } },
      { returnDocument: "after" },
    )
      .lean<MembershipRecord>()
      .exec();
  },

  async delete(weddingId: string, membershipId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await MembershipModel.deleteOne({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: toObjectId(membershipId, "membershipId"),
    }).exec();
    return result.deletedCount === 1;
  },
};
