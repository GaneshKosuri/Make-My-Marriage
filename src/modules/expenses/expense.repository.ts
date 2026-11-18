import "server-only";

import type { QueryFilter } from "mongoose";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { pageSkip } from "@/server/http/pagination";

import type { ExpenseCategory, ExpenseCurrency } from "./expense.constants";
import { ExpenseModel, type ExpenseDoc, type ExpenseRecord } from "./expense.model";

export interface ExpenseListFilter {
  category?: ExpenseCategory;
  eventId?: string;
  vendorId?: string;
  /** Calendar days at UTC midnight, both included. */
  from?: Date;
  to?: Date;
}

/** The fields an organiser sets on create and update (ids as strings, null = none). */
export interface ExpenseFields {
  title: string;
  amountPaise: number;
  currency: ExpenseCurrency;
  expenseDate: Date;
  category: ExpenseCategory;
  eventId: string | null;
  vendorId: string | null;
  notes: string | null;
}

const byId = (weddingId: string, expenseId: string) => ({
  weddingId: toObjectId(weddingId, "weddingId"),
  _id: toObjectId(expenseId, "expenseId"),
});

/** Form fields → document fields: ids as ObjectIds. */
function toDocFields(fields: Partial<ExpenseFields>): Partial<ExpenseDoc> {
  const { eventId, vendorId, ...rest } = fields;
  return {
    ...rest,
    ...(eventId !== undefined && {
      eventId: eventId === null ? null : toObjectId(eventId, "eventId"),
    }),
    ...(vendorId !== undefined && {
      vendorId: vendorId === null ? null : toObjectId(vendorId, "vendorId"),
    }),
  };
}

/** Data access for `expenses`. `weddingId` is ALWAYS the first argument. */
export const expenseRepository = {
  /** Newest date first, then newest entry (API_DESIGN §53). Filters combine with AND. */
  async list(
    weddingId: string,
    filter: ExpenseListFilter,
    page: PageQuery,
  ): Promise<{ items: ExpenseRecord[]; total: number }> {
    await connectToDatabase();
    const query: QueryFilter<ExpenseDoc> = { weddingId: toObjectId(weddingId, "weddingId") };
    if (filter.category) query.category = filter.category;
    if (filter.eventId) query.eventId = toObjectId(filter.eventId, "eventId");
    if (filter.vendorId) query.vendorId = toObjectId(filter.vendorId, "vendorId");
    if (filter.from || filter.to) {
      query.expenseDate = {
        ...(filter.from && { $gte: filter.from }),
        ...(filter.to && { $lte: filter.to }),
      };
    }
    const [items, total] = await Promise.all([
      ExpenseModel.find(query)
        .sort({ expenseDate: -1, createdAt: -1, _id: -1 })
        .skip(pageSkip(page))
        .limit(page.limit)
        .lean<ExpenseRecord[]>()
        .exec(),
      ExpenseModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  },

  async findById(weddingId: string, expenseId: string): Promise<ExpenseRecord | null> {
    await connectToDatabase();
    return ExpenseModel.findOne(byId(weddingId, expenseId)).lean<ExpenseRecord>().exec();
  },

  async create(
    weddingId: string,
    input: ExpenseFields & { createdByMembershipId: string },
  ): Promise<ExpenseRecord> {
    await connectToDatabase();
    const { createdByMembershipId, ...fields } = input;
    const doc = await ExpenseModel.create({
      ...toDocFields(fields),
      weddingId: toObjectId(weddingId, "weddingId"),
      createdByMembershipId: toObjectId(createdByMembershipId, "createdByMembershipId"),
    });
    return doc.toObject() as ExpenseRecord;
  },

  /** Applies `changes` only while the expense is still at `expectedVersion`; null otherwise. */
  async updateVersioned(
    weddingId: string,
    expenseId: string,
    expectedVersion: number,
    changes: Partial<ExpenseFields>,
  ): Promise<ExpenseRecord | null> {
    await connectToDatabase();
    return ExpenseModel.findOneAndUpdate(
      { ...byId(weddingId, expenseId), __v: expectedVersion },
      { $set: toDocFields(changes), $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<ExpenseRecord>()
      .exec();
  },

  /** Hard delete (DATABASE_DESIGN §59). */
  async delete(weddingId: string, expenseId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await ExpenseModel.deleteOne(byId(weddingId, expenseId)).exec();
    return result.deletedCount === 1;
  },

  /** SUM(amountPaise) for the wedding (DATABASE_DESIGN §58, §88); 0 when there are none. */
  async sumTotal(weddingId: string): Promise<number> {
    await connectToDatabase();
    const [row] = await ExpenseModel.aggregate<{ total: number }>([
      { $match: { weddingId: toObjectId(weddingId, "weddingId") } },
      { $group: { _id: null, total: { $sum: "$amountPaise" } } },
    ]).exec();
    return row?.total ?? 0;
  },

  /**
   * The total and the amount per category, largest first (ties by category
   * name). `$match: { weddingId }` comes first, as the tenant guard requires.
   */
  async sumByCategory(
    weddingId: string,
  ): Promise<{ total: number; byCategory: { category: ExpenseCategory; amountPaise: number }[] }> {
    await connectToDatabase();
    const rows = await ExpenseModel.aggregate<{ _id: ExpenseCategory; amountPaise: number }>([
      { $match: { weddingId: toObjectId(weddingId, "weddingId") } },
      { $group: { _id: "$category", amountPaise: { $sum: "$amountPaise" } } },
      { $sort: { amountPaise: -1, _id: 1 } },
    ]).exec();
    const byCategory = rows.map((row) => ({ category: row._id, amountPaise: row.amountPaise }));
    return { total: byCategory.reduce((sum, row) => sum + row.amountPaise, 0), byCategory };
  },
};
