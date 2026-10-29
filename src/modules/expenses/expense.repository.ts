import "server-only";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { notImplemented } from "@/server/errors";

import type { ExpenseCategory } from "./expense.constants";
import { ExpenseModel, type ExpenseDoc, type ExpenseRecord } from "./expense.model";

export interface ExpenseListFilter {
  category?: ExpenseCategory;
  eventId?: string;
  vendorId?: string;
  from?: Date;
  to?: Date;
}

/** Data access for `expenses`. `weddingId` is ALWAYS the first argument. */
export const expenseRepository = {
  /** expenseDate DESC (API_DESIGN §53). */
  async list(
    weddingId: string,
    filter: ExpenseListFilter,
    page: PageQuery,
  ): Promise<{ items: ExpenseRecord[]; total: number }> {
    return notImplemented("API_DESIGN §53 (Phase 4: Financial & Vendors)");
  },

  async findById(weddingId: string, expenseId: string): Promise<ExpenseRecord | null> {
    return notImplemented("API_DESIGN §56 (Phase 4: Financial & Vendors)");
  },

  async create(
    weddingId: string,
    input: Omit<ExpenseDoc, "weddingId" | "createdAt" | "updatedAt">,
  ): Promise<ExpenseRecord> {
    return notImplemented("API_DESIGN §54 (Phase 4: Financial & Vendors)");
  },

  async update(
    weddingId: string,
    expenseId: string,
    changes: Partial<ExpenseDoc>,
  ): Promise<ExpenseRecord | null> {
    return notImplemented("API_DESIGN §57 (Phase 4: Financial & Vendors)");
  },

  async delete(weddingId: string, expenseId: string): Promise<boolean> {
    return notImplemented("API_DESIGN §58 (Phase 4: Financial & Vendors)");
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

  /** `$match: { weddingId }` first, then group by category (tenant guard requires it). */
  async sumByCategory(
    weddingId: string,
  ): Promise<{ total: number; byCategory: { category: ExpenseCategory; amountPaise: number }[] }> {
    return notImplemented("API_DESIGN §55, DATABASE_DESIGN §58 (Phase 4: Financial & Vendors)");
  },
};
