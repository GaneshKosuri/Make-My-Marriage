import "server-only";

import type { QueryFilter } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";

import { EventModel, type EventDoc, type EventRecord } from "./event.model";

/** The fields a member sets on create and update; the rest are managed here. */
export type EventFields = Pick<
  EventDoc,
  "name" | "type" | "startsAt" | "endsAt" | "venueName" | "address" | "description" | "dressCode"
>;

const byId = (weddingId: string, eventId: string) => ({
  weddingId: toObjectId(weddingId, "weddingId"),
  _id: toObjectId(eventId, "eventId"),
});

/**
 * Data access for `events`. `weddingId` is ALWAYS the first argument and part
 * of every filter (DATABASE_DESIGN §81).
 */
export const eventRepository = {
  /** startsAt ASC (then _id); `from`/`to` keep events starting in [from, to). */
  async list(
    weddingId: string,
    filter: { includeArchived: boolean; from?: Date; to?: Date },
  ): Promise<EventRecord[]> {
    await connectToDatabase();
    const query: QueryFilter<EventDoc> = { weddingId: toObjectId(weddingId, "weddingId") };
    if (!filter.includeArchived) query.archivedAt = null;
    if (filter.from || filter.to) {
      query.startsAt = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lt: filter.to } : {}),
      };
    }
    return EventModel.find(query).sort({ startsAt: 1, _id: 1 }).lean<EventRecord[]>().exec();
  },

  /** Includes archived events. */
  async findById(weddingId: string, eventId: string): Promise<EventRecord | null> {
    await connectToDatabase();
    return EventModel.findOne(byId(weddingId, eventId)).lean<EventRecord>().exec();
  },

  /** Active (non-archived) events among `eventIds`, for cross-entity validation. */
  async findActiveByIds(weddingId: string, eventIds: readonly string[]): Promise<EventRecord[]> {
    if (eventIds.length === 0) return [];
    await connectToDatabase();
    return EventModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: { $in: eventIds.map((id) => toObjectId(id, "eventId")) },
      archivedAt: null,
    })
      .lean<EventRecord[]>()
      .exec();
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

  async create(weddingId: string, input: EventFields): Promise<EventRecord> {
    await connectToDatabase();
    const doc = await EventModel.create({
      ...input,
      weddingId: toObjectId(weddingId, "weddingId"),
      coverImageObjectKey: null,
      archivedAt: null,
    });
    return doc.toObject() as EventRecord;
  },

  /**
   * Applies `changes` to an active event whose `__v` is still `expectedVersion`
   * and bumps the version. Null → the caller works out NOT_FOUND, archived or CONFLICT.
   */
  async updateVersioned(
    weddingId: string,
    eventId: string,
    expectedVersion: number,
    changes: Partial<EventFields>,
  ): Promise<EventRecord | null> {
    await connectToDatabase();
    return EventModel.findOneAndUpdate(
      { ...byId(weddingId, eventId), __v: expectedVersion, archivedAt: null },
      { $set: changes, $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<EventRecord>()
      .exec();
  },

  /**
   * Sets archivedAt on an active event and bumps the version, so an edit made
   * from a stale copy is refused. False when it is missing or already archived.
   */
  async archive(weddingId: string, eventId: string, at: Date): Promise<boolean> {
    await connectToDatabase();
    const result = await EventModel.updateOne(
      { ...byId(weddingId, eventId), archivedAt: null },
      { $set: { archivedAt: at }, $inc: { __v: 1 } },
    ).exec();
    return result.modifiedCount === 1;
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
