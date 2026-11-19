import "server-only";

import type { QueryFilter } from "mongoose";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { pageSkip } from "@/server/http/pagination";

import type { VendorCategory, VendorSource } from "./vendor.constants";
import { VendorModel, type VendorDoc, type VendorRecord } from "./vendor.model";

export interface VendorListFilter {
  category?: VendorCategory;
  /** Name / contact person, literally (API_DESIGN §93). */
  search?: string;
  includeArchived: boolean;
}

/** The fields an organiser sets on create and update (event ids as strings). */
export interface VendorFields {
  name: string;
  category: VendorCategory;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  totalAgreedCostPaise: number | null;
  eventIds: string[];
  notes: string | null;
}

const byId = (weddingId: string, vendorId: string) => ({
  weddingId: toObjectId(weddingId, "weddingId"),
  _id: toObjectId(vendorId, "vendorId"),
});

/** Matches `text` literally: every regex metacharacter is escaped. */
function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Form fields → document fields: event ids as ObjectIds. */
function toDocFields(fields: Partial<VendorFields>): Partial<VendorDoc> {
  const { eventIds, ...rest } = fields;
  return {
    ...rest,
    ...(eventIds !== undefined && {
      eventIds: eventIds.map((id) => toObjectId(id, "eventIds")),
    }),
  };
}

/** Name order ignoring case ("pixel" next to "Pixel"). */
const NAME_COLLATION = { locale: "en", strength: 2 } as const;

/** Data access for `vendors`. `weddingId` is ALWAYS the first argument. */
export const vendorRepository = {
  /**
   * Active vendors first (archived ones only when asked for), then by name
   * ignoring case, then `_id`. Filters combine with AND.
   */
  async list(
    weddingId: string,
    filter: VendorListFilter,
    page: PageQuery,
  ): Promise<{ items: VendorRecord[]; total: number }> {
    await connectToDatabase();
    const query: QueryFilter<VendorDoc> = { weddingId: toObjectId(weddingId, "weddingId") };
    if (!filter.includeArchived) query.archivedAt = null;
    if (filter.category) query.category = filter.category;
    if (filter.search) {
      const pattern = literal(filter.search);
      query.$or = [{ name: pattern }, { contactPerson: pattern }];
    }
    const [items, total] = await Promise.all([
      VendorModel.find(query)
        .collation(NAME_COLLATION)
        .sort({ archivedAt: 1, name: 1, _id: 1 })
        .skip(pageSkip(page))
        .limit(page.limit)
        .lean<VendorRecord[]>()
        .exec(),
      VendorModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  },

  async findById(weddingId: string, vendorId: string): Promise<VendorRecord | null> {
    await connectToDatabase();
    return VendorModel.findOne(byId(weddingId, vendorId)).lean<VendorRecord>().exec();
  },

  /** Vendors of this wedding among `vendorIds`, archived included. */
  async findByIds(weddingId: string, vendorIds: readonly string[]): Promise<VendorRecord[]> {
    if (vendorIds.length === 0) return [];
    await connectToDatabase();
    return VendorModel.find({
      weddingId: toObjectId(weddingId, "weddingId"),
      _id: { $in: vendorIds.map((id) => toObjectId(id, "vendorId")) },
    })
      .lean<VendorRecord[]>()
      .exec();
  },

  /** Vendors of this wedding (archived included) for these Google places. */
  async findByPlaceIds(
    weddingId: string,
    googlePlaceIds: readonly string[],
  ): Promise<Pick<VendorRecord, "_id" | "googlePlaceId" | "archivedAt">[]> {
    if (googlePlaceIds.length === 0) return [];
    await connectToDatabase();
    return VendorModel.find(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        googlePlaceId: { $in: [...googlePlaceIds] },
      },
      { _id: 1, googlePlaceId: 1, archivedAt: 1 },
    )
      .lean<Pick<VendorRecord, "_id" | "googlePlaceId" | "archivedAt">[]>()
      .exec();
  },

  async create(
    weddingId: string,
    input: VendorFields & { source: VendorSource; googlePlaceId: string | null },
  ): Promise<VendorRecord> {
    await connectToDatabase();
    const doc = await VendorModel.create({
      ...toDocFields(input),
      weddingId: toObjectId(weddingId, "weddingId"),
    });
    return doc.toObject() as VendorRecord;
  },

  /**
   * Applies `changes` only while the vendor is still at `expectedVersion` and
   * not archived; null otherwise (the caller works out why).
   */
  async updateVersioned(
    weddingId: string,
    vendorId: string,
    expectedVersion: number,
    changes: Partial<VendorFields>,
  ): Promise<VendorRecord | null> {
    await connectToDatabase();
    return VendorModel.findOneAndUpdate(
      { ...byId(weddingId, vendorId), __v: expectedVersion, archivedAt: null },
      { $set: toDocFields(changes), $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<VendorRecord>()
      .exec();
  },

  /** Sets archivedAt once; false when missing or already archived. */
  async archive(weddingId: string, vendorId: string, at: Date): Promise<boolean> {
    await connectToDatabase();
    const result = await VendorModel.updateOne(
      { ...byId(weddingId, vendorId), archivedAt: null },
      { $set: { archivedAt: at }, $inc: { __v: 1 } },
    ).exec();
    return result.modifiedCount === 1;
  },

  async countActive(weddingId: string): Promise<number> {
    await connectToDatabase();
    return VendorModel.countDocuments({
      weddingId: toObjectId(weddingId, "weddingId"),
      archivedAt: null,
    }).exec();
  },
};
