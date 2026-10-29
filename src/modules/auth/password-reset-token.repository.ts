import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";

import {
  PasswordResetTokenModel,
  type PasswordResetTokenRecord,
} from "./password-reset-token.model";

/** Data access for `password_reset_tokens` (DATABASE_DESIGN §12). Keyed by user / token hash. */
export const passwordResetTokenRepository = {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    await connectToDatabase();
    const doc = await PasswordResetTokenModel.create({
      userId: toObjectId(input.userId, "userId"),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    });
    return doc.toObject() as PasswordResetTokenRecord;
  },

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    await connectToDatabase();
    return PasswordResetTokenModel.findOne({ tokenHash }).lean<PasswordResetTokenRecord>().exec();
  },

  /**
   * Atomically marks an unused, unexpired token as used. False when another
   * request used it first or it expired in the meantime.
   */
  async markUsed(tokenId: string, usedAt: Date): Promise<boolean> {
    await connectToDatabase();
    const result = await PasswordResetTokenModel.updateOne(
      { _id: toObjectId(tokenId), usedAt: null, expiresAt: { $gt: usedAt } },
      { $set: { usedAt } },
    ).exec();
    return result.modifiedCount === 1;
  },
};
