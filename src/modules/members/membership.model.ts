import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import { MEMBER_ROLES, type MemberRole } from "./member.constants";

/**
 * `wedding_memberships` (DATABASE_DESIGN §23–27): User ↔ Wedding with a role.
 * V1 rule: one user → one wedding (unique userId). Hard delete on removal.
 */
export interface MembershipDoc {
  userId: Types.ObjectId;
  weddingId: Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRecord = WithId<MembershipDoc>;

const membershipSchema = new Schema<MembershipDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    role: { type: String, enum: MEMBER_ROLES, required: true },
    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions("wedding_memberships"),
);

membershipSchema.index({ userId: 1 }, { unique: true, name: "userId_unique" });
membershipSchema.index(
  { weddingId: 1, userId: 1 },
  { unique: true, name: "weddingId_userId_unique" },
);
membershipSchema.index({ weddingId: 1, role: 1 }, { name: "weddingId_role" });

membershipSchema.plugin(tenantGuardPlugin);

export const MembershipModel = defineModel<MembershipDoc>("WeddingMembership", membershipSchema);
