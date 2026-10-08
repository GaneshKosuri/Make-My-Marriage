import "server-only";

import { Schema } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";

import { EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from "./auth.constants";

/** `users` — authenticated Wedding Members only; guests never appear here (DATABASE_DESIGN §7). */
export interface UserDoc {
  name: string;
  email: string;
  /** trim + lowercase (DATABASE_DESIGN §7). Unique: one account per email. */
  emailNormalized: string;
  /** argon2id. select:false — load explicitly with `.select("+passwordHash")`. */
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRecord = WithId<UserDoc>;

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: USER_NAME_MAX_LENGTH },
    email: { type: String, required: true, trim: true, maxlength: EMAIL_MAX_LENGTH },
    emailNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: EMAIL_MAX_LENGTH,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  baseSchemaOptions("users"),
);

userSchema.index({ emailNormalized: 1 }, { unique: true, name: "emailNormalized_unique" });

export const UserModel = defineModel<UserDoc>("User", userSchema);
