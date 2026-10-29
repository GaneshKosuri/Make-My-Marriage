import "server-only";

import type { ClientSession } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { TENANT_SCOPED_OPTION } from "@/server/db/plugins/tenant-guard";

import type { MemberRole } from "./member.constants";
import { MemberInvitationModel, type MemberInvitationRecord } from "./member-invitation.model";

/** Data access for `wedding_member_invitations` (DATABASE_DESIGN §28–30). */
export const memberInvitationRepository = {
  async create(
    weddingId: string,
    input: {
      email: string;
      emailNormalized: string;
      role: MemberRole;
      tokenHash: string;
      invitedByUserId: string;
      expiresAt: Date;
    },
  ): Promise<MemberInvitationRecord> {
    await connectToDatabase();
    const doc = await MemberInvitationModel.create({
      weddingId: toObjectId(weddingId, "weddingId"),
      email: input.email,
      emailNormalized: input.emailNormalized,
      role: input.role,
      tokenHash: input.tokenHash,
      status: "PENDING",
      invitedByUserId: toObjectId(input.invitedByUserId, "userId"),
      expiresAt: input.expiresAt,
    });
    return doc.toObject() as MemberInvitationRecord;
  },

  /** PENDING and not yet expired, newest first (API §23). */
  async listPending(weddingId: string, now: Date): Promise<MemberInvitationRecord[]> {
    await connectToDatabase();
    return MemberInvitationModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      status: "PENDING",
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean<MemberInvitationRecord[]>()
      .exec();
  },

  /** The PENDING invitation for this email, expired or not (at most one: partial unique index). */
  async findPendingByEmail(
    weddingId: string,
    emailNormalized: string,
  ): Promise<MemberInvitationRecord | null> {
    await connectToDatabase();
    return MemberInvitationModel.findOne({
      weddingId: toObjectId(weddingId, "weddingId"),
      emailNormalized,
      status: "PENDING",
    })
      .lean<MemberInvitationRecord>()
      .exec();
  },

  /** PENDING → REVOKED. False when it is missing, in another wedding or no longer pending. */
  async revoke(weddingId: string, invitationId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await MemberInvitationModel.updateOne(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        _id: toObjectId(invitationId, "invitationId"),
        status: "PENDING",
      },
      { $set: { status: "REVOKED" } },
    ).exec();
    return result.modifiedCount === 1;
  },

  /** Token resolution — a sanctioned tenant-guard opt-out (no weddingId yet). */
  async findByTokenHash(tokenHash: string): Promise<MemberInvitationRecord | null> {
    await connectToDatabase();
    return MemberInvitationModel.findOne({ tokenHash })
      .setOptions({ [TENANT_SCOPED_OPTION]: false })
      .lean<MemberInvitationRecord>()
      .exec();
  },

  /**
   * PENDING and unexpired → ACCEPTED, inside the accept transaction. False when
   * another request accepted, revoked or outlived it first.
   */
  async markAccepted(
    weddingId: string,
    invitationId: string,
    acceptedByUserId: string,
    acceptedAt: Date,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await MemberInvitationModel.updateOne(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        _id: toObjectId(invitationId, "invitationId"),
        status: "PENDING",
        expiresAt: { $gt: acceptedAt },
      },
      {
        $set: {
          status: "ACCEPTED",
          acceptedByUserId: toObjectId(acceptedByUserId, "userId"),
          acceptedAt,
        },
      },
      { session },
    ).exec();
    return result.modifiedCount === 1;
  },
};
