import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { notImplemented } from "@/server/errors";

import { UserModel, type UserRecord } from "./user.model";

/**
 * Data access for `users`. Users are not wedding-owned, so these functions
 * are keyed by user id / email rather than weddingId.
 */
export const userRepository = {
  /** Used by identity resolution (implemented now). */
  async findById(userId: string): Promise<UserRecord | null> {
    await connectToDatabase();
    return UserModel.findById(toObjectId(userId, "userId")).lean<UserRecord>().exec();
  },

  /** Includes passwordHash (select:false) for login. */
  async findByEmailNormalizedWithPassword(emailNormalized: string): Promise<UserRecord | null> {
    return notImplemented("API_DESIGN §12 (Phase 1: Foundation)");
  },

  async create(input: {
    name: string;
    email: string;
    emailNormalized: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    return notImplemented("API_DESIGN §11 (Phase 1: Foundation)");
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    return notImplemented("API_DESIGN §16 (Phase 1: Foundation)");
  },
};
