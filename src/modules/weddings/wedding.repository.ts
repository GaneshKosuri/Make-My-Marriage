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
    return notImplemented("DATABASE_DESIGN §85 (Phase 1: Foundation)");
  },

  async update(weddingId: string, changes: Partial<WeddingDoc>): Promise<WeddingRecord | null> {
    return notImplemented("API_DESIGN §19 (Phase 1: Foundation)");
  },

  async slugExists(slug: string): Promise<boolean> {
    return notImplemented("SYSTEM_DESIGN §27 (Phase 1: Foundation)");
  },

  /** Public website: published and not deleted (API_DESIGN §69). */
  async findPublishedBySlug(slug: string): Promise<WeddingRecord | null> {
    return notImplemented("API_DESIGN §69 (Phase 5: Wedding Experience)");
  },

  /** Gallery token resolution — selects `+gallery.token` explicitly (API_DESIGN §79–82). */
  async findByGalleryToken(token: string): Promise<WeddingRecord | null> {
    return notImplemented("API_DESIGN §79–82 (Phase 6: Memories)");
  },

  /** Explicit projection of the stable gallery token for share URLs (API_DESIGN §73). */
  async getGalleryToken(weddingId: string): Promise<string | null> {
    return notImplemented("API_DESIGN §73 (Phase 6: Memories)");
  },
};
