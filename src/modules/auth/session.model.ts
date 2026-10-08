import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";

/**
 * `sessions` (DATABASE_DESIGN §9–11). The raw token lives only in the
 * browser cookie; MongoDB stores its HMAC("session").
 */
export interface SessionDoc {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocRecord = WithId<SessionDoc>;

const sessionSchema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: null },
  },
  baseSchemaOptions("sessions"),
);

sessionSchema.index({ tokenHash: 1 }, { unique: true, name: "tokenHash_unique" });
sessionSchema.index({ userId: 1 }, { name: "userId" });
// MongoDB removes sessions once expiresAt passes.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });

export const SessionModel = defineModel<SessionDoc>("Session", sessionSchema);
