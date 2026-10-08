import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  EXPENSE_AMOUNT_MAX_PAISE,
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_NOTES_MAX_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
  type ExpenseCategory,
  type ExpenseCurrency,
} from "./expense.constants";

/**
 * `expenses` (DATABASE_DESIGN §55–59). Money already spent/committed — not a
 * budget. `amountPaise` is an integer (DATABASE_DESIGN §50). Hard-deleted.
 */
export interface ExpenseDoc {
  weddingId: Types.ObjectId;
  title: string;
  amountPaise: number;
  currency: ExpenseCurrency;
  /** The API's date-only value stored as UTC midnight (see "Open decisions"). */
  expenseDate: Date;
  category: ExpenseCategory;
  eventId: Types.ObjectId | null;
  vendorId: Types.ObjectId | null;
  notes: string | null;
  createdByMembershipId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseRecord = WithId<ExpenseDoc>;

const expenseSchema = new Schema<ExpenseDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    title: { type: String, required: true, trim: true, maxlength: EXPENSE_TITLE_MAX_LENGTH },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      max: EXPENSE_AMOUNT_MAX_PAISE,
      validate: { validator: Number.isSafeInteger, message: "amountPaise must be an integer" },
    },
    currency: { type: String, enum: EXPENSE_CURRENCIES, required: true, default: "INR" },
    expenseDate: { type: Date, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    notes: { type: String, trim: true, maxlength: EXPENSE_NOTES_MAX_LENGTH, default: null },
    createdByMembershipId: {
      type: Schema.Types.ObjectId,
      ref: "WeddingMembership",
      required: true,
    },
  },
  baseSchemaOptions("expenses"),
);

expenseSchema.index({ weddingId: 1, expenseDate: -1 }, { name: "weddingId_expenseDate" });
expenseSchema.index({ weddingId: 1, category: 1 }, { name: "weddingId_category" });
expenseSchema.index({ weddingId: 1, eventId: 1 }, { name: "weddingId_eventId" });
expenseSchema.index({ weddingId: 1, vendorId: 1 }, { name: "weddingId_vendorId" });

expenseSchema.plugin(tenantGuardPlugin);

export const ExpenseModel = defineModel<ExpenseDoc>("Expense", expenseSchema);
