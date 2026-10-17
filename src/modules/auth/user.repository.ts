import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { isDuplicateKeyError } from "@/server/db/errors";
import { toObjectId } from "@/server/db/object-id";
import { AppError } from "@/server/errors";

import { UserModel, type UserRecord } from "./user.model";

/**
 * Data access for `users`. Users are not wedding-owned, so these functions
 * are keyed by user id / email rather than weddingId.
 */
export const userRepository = {
  /** Used by identity resolution. */
  async findById(userId: string): Promise<UserRecord | null> {
    await connectToDatabase();
    return UserModel.findById(toObjectId(userId, "userId")).lean<UserRecord>().exec();
  },

  async findByEmailNormalized(emailNormalized: string): Promise<UserRecord | null> {
    await connectToDatabase();
    return UserModel.findOne({ emailNormalized }).lean<UserRecord>().exec();
  },

  /** Includes passwordHash (select:false) for login. */
  async findByEmailNormalizedWithPassword(emailNormalized: string): Promise<UserRecord | null> {
    await connectToDatabase();
    return UserModel.findOne({ emailNormalized }).select("+passwordHash").lean<UserRecord>().exec();
  },

  /** EMAIL_ALREADY_EXISTS when the unique index catches a concurrent signup. */
  async create(input: {
    name: string;
    email: string;
    emailNormalized: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    await connectToDatabase();
    try {
      const doc = await UserModel.create(input);
      return doc.toObject() as UserRecord;
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new AppError("EMAIL_ALREADY_EXISTS");
      throw error;
    }
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne(
      { _id: toObjectId(userId, "userId") },
      { $set: { passwordHash } },
    ).exec();
  },
};
