import "server-only";

import type { ClientSession } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { notImplemented } from "@/server/errors";

import type { WeddingDoc, WeddingRecord } from "./wedding.model";
import { WeddingModel } from "./wedding.model";

/**
 * Data access for `weddings`. The wedding id is the tenant id, so it is the
 * first argument. Every read excludes soft-deleted weddings.
 */
export const weddingRepository = {
  /** Identity resolution and layouts. Implemented now. */
  async findActiveById(weddingId: string): Promise<WeddingRecord | null> {
    await connectToDatabase();
    return WeddingModel.findOne({ _id: toObjectId(weddingId, "weddingId"), deletedAt: null })
      .lean<WeddingRecord>()
      .exec();
  },

  async create(
    input: Omit<WeddingDoc, "createdAt" | "updatedAt" | "deletedAt">,
    session: ClientSession,
  ): Promise<WeddingRecord> {
    await connectToDatabase();
    const [doc] = await WeddingModel.create([{ ...input, deletedAt: null }], { session });
    if (!doc) throw new Error("Wedding was not created");
    return doc.toObject() as WeddingRecord;
  },

  /** Sets the given top-level fields on an active wedding; null when it is missing or deleted. */
  async update(
    weddingId: string,
    changes: Partial<
      Pick<
        WeddingDoc,
        | "brideName"
        | "groomName"
        | "title"
        | "description"
        | "weddingDate"
        | "timeZone"
        | "location"
      >
    >,
  ): Promise<WeddingRecord | null> {
    await connectToDatabase();
    return WeddingModel.findOneAndUpdate(
      { _id: toObjectId(weddingId, "weddingId"), deletedAt: null },
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    )
      .lean<WeddingRecord>()
      .exec();
  },

  /** Includes soft-deleted weddings: a slug is never reused. */
  async slugExists(slug: string): Promise<boolean> {
    await connectToDatabase();
    return (await WeddingModel.exists({ "website.slug": slug }).exec()) !== null;
  },

  /** Public website: published and not deleted (API_DESIGN §69). */
  async findPublishedBySlug(slug: string): Promise<WeddingRecord | null> {
    return notImplemented("API_DESIGN §69 (Phase 5: Wedding Experience)");
  },

  /** Gallery token resolution (API_DESIGN §79–82): an active wedding with this token. */
  async findByGalleryToken(token: string): Promise<WeddingRecord | null> {
    await connectToDatabase();
    return WeddingModel.findOne({ "gallery.token": token, deletedAt: null })
      .lean<WeddingRecord>()
      .exec();
  },

  /** Explicit projection of the stable gallery token for share URLs (API_DESIGN §73). */
  async getGalleryToken(weddingId: string): Promise<string | null> {
    await connectToDatabase();
    const wedding = await WeddingModel.findOne(
      { _id: toObjectId(weddingId, "weddingId"), deletedAt: null },
      { "gallery.token": 1 },
    )
      .select("+gallery.token")
      .lean<Pick<WeddingRecord, "gallery">>()
      .exec();
    return wedding?.gallery?.token ?? null;
  },

  /** Sets the gallery switches; null when the wedding is missing or deleted. */
  async updateGallery(
    weddingId: string,
    changes: { isEnabled?: boolean; guestUploadsEnabled?: boolean },
  ): Promise<WeddingRecord | null> {
    await connectToDatabase();
    const set: Record<string, boolean> = {};
    if (changes.isEnabled !== undefined) set["gallery.isEnabled"] = changes.isEnabled;
    if (changes.guestUploadsEnabled !== undefined) {
      set["gallery.guestUploadsEnabled"] = changes.guestUploadsEnabled;
    }
    return WeddingModel.findOneAndUpdate(
      { _id: toObjectId(weddingId, "weddingId"), deletedAt: null },
      { $set: set },
      { returnDocument: "after" },
    )
      .lean<WeddingRecord>()
      .exec();
  },
};
