import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import { EMAIL_MAX_LENGTH } from "@/modules/auth/auth.constants";

import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberInvitationStatus,
  type MemberRole,
} from "./member.constants";

/**
 * `wedding_member_invitations` (DATABASE_DESIGN §28–30). Only HMAC("member-invite")
 * of the token is stored. Status is kept (never deleted); expiry is derived.
 */
export interface MemberInvitationDoc {
  weddingId: Types.ObjectId;
  email: string;
  emailNormalized: string;
  role: MemberRole;
  tokenHash: string;
  status: MemberInvitationStatus;
  invitedByUserId: Types.ObjectId;
  acceptedByUserId: Types.ObjectId | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MemberInvitationRecord = WithId<MemberInvitationDoc>;

const memberInvitationSchema = new Schema<MemberInvitationDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    email: { type: String, required: true, trim: true, maxlength: EMAIL_MAX_LENGTH },
    emailNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: EMAIL_MAX_LENGTH,
    },
    role: { type: String, enum: MEMBER_ROLES, required: true },
    tokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: MEMBER_INVITATION_STATUSES, required: true, default: "PENDING" },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    // Not a TTL index: invitations keep their status history (DATABASE_DESIGN §92).
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  baseSchemaOptions("wedding_member_invitations"),
);

memberInvitationSchema.index({ tokenHash: 1 }, { unique: true, name: "tokenHash_unique" });
memberInvitationSchema.index({ weddingId: 1, status: 1 }, { name: "weddingId_status" });
memberInvitationSchema.index({ emailNormalized: 1 }, { name: "emailNormalized" });
memberInvitationSchema.index({ expiresAt: 1 }, { name: "expiresAt" });
// Only one PENDING invitation per wedding + email (DATABASE_DESIGN §29).
memberInvitationSchema.index(
  { weddingId: 1, emailNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
    name: "weddingId_emailNormalized_pending_unique",
  },
);

memberInvitationSchema.plugin(tenantGuardPlugin);

export const MemberInvitationModel = defineModel<MemberInvitationDoc>(
  "WeddingMemberInvitation",
  memberInvitationSchema,
);
