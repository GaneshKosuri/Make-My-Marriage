import "server-only";

import type { SessionRecord, SessionStore } from "@/server/auth/identity";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";

import { SessionModel, type SessionDocRecord } from "./session.model";

function toSessionRecord(doc: SessionDocRecord): SessionRecord {
  return {
    sessionId: doc._id.toString(),
    userId: doc.userId.toString(),
    expiresAt: doc.expiresAt,
    lastUsedAt: doc.lastUsedAt ?? null,
  };
}

/**
 * MongoDB implementation of the SessionStore port (src/server/auth/identity.ts).
 * Fully implemented now: session create → resolve → destroy is scaffold infrastructure.
 */
export const sessionRepository: SessionStore = {
  async create({ userId, tokenHash, expiresAt }) {
    await connectToDatabase();
    const doc = await SessionModel.create({
      userId: toObjectId(userId, "userId"),
      tokenHash,
      expiresAt,
      lastUsedAt: null,
    });
    return toSessionRecord(doc.toObject());
  },

  async findByTokenHash(tokenHash) {
    await connectToDatabase();
    const doc = await SessionModel.findOne({ tokenHash }).lean<SessionDocRecord>().exec();
    return doc ? toSessionRecord(doc) : null;
  },

  async touch(sessionId, at) {
    await connectToDatabase();
    await SessionModel.updateOne(
      { _id: toObjectId(sessionId) },
      { $set: { lastUsedAt: at } },
    ).exec();
  },

  async deleteByTokenHash(tokenHash) {
    await connectToDatabase();
    await SessionModel.deleteOne({ tokenHash }).exec();
  },

  async deleteAllForUser(userId) {
    await connectToDatabase();
    const result = await SessionModel.deleteMany({ userId: toObjectId(userId, "userId") }).exec();
    return result.deletedCount;
  },
};
