import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { notImplemented } from "@/server/errors";

import { EventModel, type EventDoc, type EventRecord } from "./event.model";

/**
 * Data access for `events`. `weddingId` is ALWAYS the first argument and part
 * of every filter (DATABASE_DESIGN §81).
 */
export const eventRepository = {
  async list(
    weddingId: string,
    filter: { includeArchived: boolean; from?: Date; to?: Date },
  ): Promise<EventRecord[]> {
    return notImplemented("API_DESIGN §29 (Phase 2: Planning)");
  },

  async findById(weddingId: string, eventId: string): Promise<EventRecord | null> {
    return notImplemented("API_DESIGN §31 (Phase 2: Planning)");
  },

  /** Active (non-archived) events among `eventIds`, for cross-entity validation. */
  async findActiveByIds(weddingId: string, eventIds: readonly string[]): Promise<EventRecord[]> {
    return notImplemented("DATABASE_DESIGN §83 (Phase 2: Planning)");
  },

  async findByIds(weddingId: string, eventIds: readonly string[]): Promise<EventRecord[]> {
    if (eventIds.length === 0) return [];
    await connectToDatabase();
    return EventModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: { $in: eventIds.map((id) => toObjectId(id, "eventId")) },
    })
      .lean<EventRecord[]>()
      .exec();
  },

  async create(
    weddingId: string,
    input: Omit<EventDoc, "weddingId" | "archivedAt" | "__v" | "createdAt" | "updatedAt">,
  ): Promise<EventRecord> {
    return notImplemented("API_DESIGN §30 (Phase 2: Planning)");
  },

  /** Conditional on `__v === expectedVersion`; null → caller raises CONFLICT or NOT_FOUND. */
  async updateVersioned(
    weddingId: string,
    eventId: string,
    expectedVersion: number,
    changes: Partial<EventDoc>,
  ): Promise<EventRecord | null> {
    return notImplemented("API_DESIGN §32 (Phase 2: Planning)");
  },

  async archive(weddingId: string, eventId: string, at: Date): Promise<boolean> {
    return notImplemented("API_DESIGN §33 (Phase 2: Planning)");
  },

  async countActive(weddingId: string): Promise<number> {
    await connectToDatabase();
    return EventModel.countDocuments({
      weddingId: toObjectId(weddingId, "weddingId"),
      archivedAt: null,
    }).exec();
  },

  /** Active events that have not finished by `from` (still running or yet to start), soonest first. */
  async listUpcoming(weddingId: string, from: Date, limit: number): Promise<EventRecord[]> {
    await connectToDatabase();
    return EventModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      archivedAt: null,
      $or: [{ startsAt: { $gte: from } }, { endsAt: { $gte: from } }],
    })
      .sort({ startsAt: 1, _id: 1 })
      .limit(limit)
      .lean<EventRecord[]>()
      .exec();
  },
};
