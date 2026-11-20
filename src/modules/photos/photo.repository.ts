import "server-only";

import type { QueryFilter } from "mongoose";

import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { afterCursorFilter, type CursorPosition } from "@/server/http/pagination";

import type { PhotoDoc, PhotoRecord } from "./photo.model";
import { PhotoModel } from "./photo.model";

/** `null` = Wedding Memories (no event); undefined = every album. */
export interface PhotoAlbumFilter {
  eventId?: string | null;
}

/** What a reservation stores (everything the server decides at issuance). */
export type PhotoReservation = Omit<
  PhotoDoc,
  "weddingId" | "eventId" | "uploadedByMembershipId" | "status" | "createdAt" | "updatedAt"
> & { eventId: string | null; uploadedByMembershipId: string | null };

function readyFilter(weddingId: string, filter: PhotoAlbumFilter): QueryFilter<PhotoDoc> {
  const query: QueryFilter<PhotoDoc> = {
    weddingId: toObjectId(weddingId, "weddingId"),
    status: "READY",
  };
  if (filter.eventId !== undefined) {
    query.eventId = filter.eventId === null ? null : toObjectId(filter.eventId, "eventId");
  }
  return query;
}

/**
 * Data access for `photos`. `weddingId` is ALWAYS the first argument; gallery
 * queries always add `status: "READY"` (2026-09-18 notes).
 */
export const photoRepository = {
  /** READY only; createdAt DESC, _id DESC; fetches `limit + 1` for the next cursor. */
  async listReady(
    weddingId: string,
    filter: PhotoAlbumFilter,
    page: { after?: CursorPosition; limit: number },
  ): Promise<PhotoRecord[]> {
    await connectToDatabase();
    const query = readyFilter(weddingId, filter);
    if (page.after) Object.assign(query, afterCursorFilter(page.after));
    return PhotoModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(page.limit + 1)
      .lean<PhotoRecord[]>()
      .exec();
  },

  async countReady(weddingId: string, filter: PhotoAlbumFilter): Promise<number> {
    await connectToDatabase();
    return PhotoModel.countDocuments(readyFilter(weddingId, filter)).exec();
  },

  async findReadyById(weddingId: string, photoId: string): Promise<PhotoRecord | null> {
    await connectToDatabase();
    return PhotoModel.findOne({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: toObjectId(photoId, "photoId"),
      status: "READY",
    })
      .lean<PhotoRecord>()
      .exec();
  },

  /** A PENDING row bound to the wedding, uploader and metadata at issuance. */
  async reservePending(weddingId: string, input: PhotoReservation): Promise<PhotoRecord> {
    await connectToDatabase();
    const doc = await PhotoModel.create({
      ...input,
      weddingId: toObjectId(weddingId, "weddingId"),
      eventId: input.eventId ? toObjectId(input.eventId, "eventId") : null,
      uploadedByMembershipId: input.uploadedByMembershipId
        ? toObjectId(input.uploadedByMembershipId, "membershipId")
        : null,
      status: "PENDING",
    });
    return doc.toObject() as PhotoRecord;
  },

  /** Any state: confirmation must tell READY (idempotent) and DELETED (refused) apart. */
  async findByUploadKey(weddingId: string, uploadKey: string): Promise<PhotoRecord | null> {
    await connectToDatabase();
    return PhotoModel.findOne({ weddingId: toObjectId(weddingId, "weddingId"), uploadKey })
      .lean<PhotoRecord>()
      .exec();
  },

  /** Atomic PENDING → READY with the final keys; null when another confirmation won. */
  async publish(
    weddingId: string,
    photoId: string,
    keys: { objectKey: string; previewObjectKey: string | null },
  ): Promise<PhotoRecord | null> {
    await connectToDatabase();
    return PhotoModel.findOneAndUpdate(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        _id: toObjectId(photoId, "photoId"),
        status: "PENDING",
      },
      {
        $set: {
          status: "READY",
          objectKey: keys.objectKey,
          previewObjectKey: keys.previewObjectKey,
        },
      },
      { returnDocument: "after" },
    )
      .lean<PhotoRecord>()
      .exec();
  },

  /** After the R2 objects are deleted: READY → DELETED tombstone. */
  async markDeleted(weddingId: string, photoId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await PhotoModel.updateOne(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        _id: toObjectId(photoId, "photoId"),
        status: "READY",
      },
      { $set: { status: "DELETED" } },
    ).exec();
    return result.modifiedCount === 1;
  },
};
