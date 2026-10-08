import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";

import { UserModel } from "@/modules/auth/user.model";
import { MembershipModel } from "@/modules/members/membership.model";
import type { MemberRole } from "@/modules/members/member.constants";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import { createSession } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/connection";

/**
 * Test data factories. Integration tests may use models directly (they sit
 * outside src/, so the dependency rules for app code do not apply).
 */

const unique = () => randomBytes(4).toString("hex");

export async function createUser(overrides: { name?: string; email?: string } = {}) {
  await connectToDatabase();
  const email = overrides.email ?? `user-${unique()}@example.com`;
  return UserModel.create({
    name: overrides.name ?? "Test User",
    email,
    emailNormalized: email.toLowerCase(),
    passwordHash: "argon2id-placeholder-hash",
  });
}

export async function createWedding(
  createdByUserId: Types.ObjectId,
  overrides: { deletedAt?: Date | null } = {},
) {
  await connectToDatabase();
  return WeddingModel.create({
    brideName: "Princi",
    groomName: "Akshay",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
    website: { slug: `princi-akshay-${unique()}` },
    gallery: { token: randomBytes(32).toString("base64url") },
    createdByUserId,
    deletedAt: overrides.deletedAt ?? null,
  });
}

export async function addMember(
  weddingId: Types.ObjectId,
  userId: Types.ObjectId,
  role: MemberRole,
) {
  await connectToDatabase();
  return MembershipModel.create({ weddingId, userId, role });
}

/** A signed-in user with a session cookie, optionally a member of `wedding` with `role`. */
export async function signedInUser(
  options: { wedding?: { _id: Types.ObjectId }; role?: MemberRole } = {},
) {
  const user = await createUser();
  if (options.wedding) await addMember(options.wedding._id, user._id, options.role ?? "MANAGER");
  const session = await createSession(user._id.toString());
  return { user, session, cookie: `mmm_session=${session.token}` };
}
