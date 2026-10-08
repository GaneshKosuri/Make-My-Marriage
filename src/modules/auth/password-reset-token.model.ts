import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";

/**
 * `password_reset_tokens` (DATABASE_DESIGN §12): random, expiring, single-use.
 * Only HMAC("password-reset") of the token is stored.
 */
export interface PasswordResetTokenDoc {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PasswordResetTokenRecord = WithId<PasswordResetTokenDoc>;

const passwordResetTokenSchema = new Schema<PasswordResetTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  baseSchemaOptions("password_reset_tokens"),
);

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true, name: "tokenHash_unique" });
passwordResetTokenSchema.index({ userId: 1 }, { name: "userId" });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });

export const PasswordResetTokenModel = defineModel<PasswordResetTokenDoc>(
  "PasswordResetToken",
  passwordResetTokenSchema,
);
