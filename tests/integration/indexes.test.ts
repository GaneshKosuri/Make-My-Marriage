import { randomBytes } from "node:crypto";

import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";

import { PasswordResetTokenModel } from "@/modules/auth/password-reset-token.model";
import { SessionModel } from "@/modules/auth/session.model";
import { UserModel } from "@/modules/auth/user.model";
import { EmailJobModel } from "@/modules/email-jobs/email-job.model";
import { EventModel } from "@/modules/events/event.model";
import { ExpenseModel } from "@/modules/expenses/expense.model";
import { GuestModel } from "@/modules/guests/guest.model";
import { MemberInvitationModel } from "@/modules/members/member-invitation.model";
import { MembershipModel } from "@/modules/members/membership.model";
import { PhotoModel } from "@/modules/photos/photo.model";
import { TaskModel } from "@/modules/tasks/task.model";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import { connectToDatabase } from "@/server/db/connection";
import { RateLimitModel } from "@/server/security/rate-limit.model";

/** DATABASE_DESIGN §112 (13 collections) + rate_limits (binding decision 4). */
/** The slice of a Mongoose model this test needs (keeps the record heterogeneous). */
interface IndexedModel {
  collection: { collectionName: string; listIndexes(): { toArray(): Promise<unknown[]> } };
  schema: { indexes(): unknown[] };
  syncIndexes(): Promise<unknown>;
}

const MODELS: Record<string, IndexedModel> = {
  users: UserModel,
  sessions: SessionModel,
  password_reset_tokens: PasswordResetTokenModel,
  weddings: WeddingModel,
  wedding_memberships: MembershipModel,
  wedding_member_invitations: MemberInvitationModel,
  events: EventModel,
  tasks: TaskModel,
  guests: GuestModel,
  vendors: VendorModel,
  expenses: ExpenseModel,
  photos: PhotoModel,
  email_jobs: EmailJobModel,
  rate_limits: RateLimitModel,
};

type IndexInfo = {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
};

const indexes = new Map<string, IndexInfo[]>();

function index(collection: string, name: string): IndexInfo {
  const found = indexes.get(collection)?.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Index ${collection}.${name} not found`);
  return found;
}

beforeAll(async () => {
  await connectToDatabase();
  for (const [collection, model] of Object.entries(MODELS)) {
    await model.syncIndexes();
    indexes.set(collection, (await model.collection.listIndexes().toArray()) as IndexInfo[]);
  }
}, 120_000);

describe("collections and indexes (DATABASE_DESIGN §91, §112)", () => {
  it("uses the documented collection names", () => {
    for (const [collection, model] of Object.entries(MODELS)) {
      expect(model.collection.collectionName).toBe(collection);
    }
  });

  it("creates every index declared by every schema", () => {
    for (const [collection, model] of Object.entries(MODELS)) {
      // +1 for the implicit _id index.
      expect(indexes.get(collection), collection).toHaveLength(model.schema.indexes().length + 1);
    }
  });

  it.each([
    ["users", "emailNormalized_unique", { emailNormalized: 1 }],
    ["sessions", "tokenHash_unique", { tokenHash: 1 }],
    ["password_reset_tokens", "tokenHash_unique", { tokenHash: 1 }],
    ["weddings", "website_slug_unique", { "website.slug": 1 }],
    ["weddings", "gallery_token_unique", { "gallery.token": 1 }],
    ["wedding_memberships", "userId_unique", { userId: 1 }],
    ["wedding_memberships", "weddingId_userId_unique", { weddingId: 1, userId: 1 }],
    ["wedding_member_invitations", "tokenHash_unique", { tokenHash: 1 }],
    ["guests", "invitationToken_unique", { invitationToken: 1 }],
    ["photos", "objectKey_unique", { objectKey: 1 }],
    ["photos", "uploadKey_unique", { uploadKey: 1 }],
    ["email_jobs", "idempotencyKey_unique", { idempotencyKey: 1 }],
  ])("%s.%s is unique", (collection, name, key) => {
    expect(index(collection, name)).toMatchObject({ key, unique: true });
  });

  it.each([
    ["sessions", "expiresAt_ttl"],
    ["password_reset_tokens", "expiresAt_ttl"],
    ["rate_limits", "expiresAt_ttl"],
  ])("%s.%s is a TTL index", (collection, name) => {
    expect(index(collection, name)).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
  });

  it("has partial unique indexes for pending member invitations and Google places", () => {
    expect(
      index("wedding_member_invitations", "weddingId_emailNormalized_pending_unique"),
    ).toMatchObject({
      unique: true,
      partialFilterExpression: { status: "PENDING" },
    });
    expect(index("vendors", "weddingId_googlePlaceId_unique")).toMatchObject({
      unique: true,
      partialFilterExpression: { googlePlaceId: { $type: "string" } },
    });
  });

  it("has the photo lifecycle listing indexes", () => {
    expect(index("photos", "weddingId_status_createdAt_id").key).toEqual({
      weddingId: 1,
      status: 1,
      createdAt: -1,
      _id: -1,
    });
    expect(index("photos", "weddingId_status_eventId_createdAt_id").key).toEqual({
      weddingId: 1,
      status: 1,
      eventId: 1,
      createdAt: -1,
      _id: -1,
    });
  });

  it("does not TTL-expire photos or member invitations (their metadata must outlive the clock)", () => {
    for (const collection of ["photos", "wedding_member_invitations"]) {
      expect(indexes.get(collection)?.some((i) => i.expireAfterSeconds !== undefined)).toBe(false);
    }
  });
});

describe("constraints behave as designed", () => {
  it("rejects a second account with the same normalized email", async () => {
    const doc = {
      name: "A",
      email: "Same@Example.com",
      emailNormalized: "same@example.com",
      passwordHash: "h",
    };
    await UserModel.create(doc);
    await expect(UserModel.create({ ...doc, email: "same@example.com" })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("allows guests to share an email address (DATABASE_DESIGN §47)", async () => {
    const weddingId = new Types.ObjectId();
    const guest = () => ({
      weddingId,
      name: "Sharma family",
      email: "family@example.com",
      emailNormalized: "family@example.com",
      invitationToken: randomBytes(32).toString("base64url"),
    });
    await GuestModel.create(guest());
    await expect(GuestModel.create(guest())).resolves.toBeDefined();
  });

  it("allows many manual vendors but only one per Google place per wedding", async () => {
    const weddingId = new Types.ObjectId();
    await VendorModel.create({ weddingId, name: "A", category: "DJ" });
    await VendorModel.create({ weddingId, name: "B", category: "DJ" });
    await VendorModel.create({
      weddingId,
      name: "C",
      category: "VENUE",
      source: "GOOGLE_PLACES",
      googlePlaceId: "p1",
    });
    await expect(
      VendorModel.create({
        weddingId,
        name: "D",
        category: "VENUE",
        source: "GOOGLE_PLACES",
        googlePlaceId: "p1",
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("keeps secrets out of default reads (select: false)", async () => {
    const weddingId = new Types.ObjectId();
    const created = await GuestModel.create({
      weddingId,
      name: "Rajesh",
      invitationToken: randomBytes(32).toString("base64url"),
    });
    const loaded = await GuestModel.findOne({ weddingId, _id: created._id }).lean();
    expect(loaded).not.toHaveProperty("invitationToken");
  });
});
