/**
 * Expense request schemas (Zod, `.strict()`). Isomorphic: the expense form
 * reuses them. A client-supplied `weddingId` or `createdByMembershipId` is
 * never accepted (API_DESIGN §54). Money is integer paise; dates are
 * calendar days ("2026-09-01").
 */
import { z } from "zod";

import { isValidDateOnly } from "@/lib/dates";
import { objectId } from "@/lib/object-id";
import { pageQuerySchema } from "@/lib/pagination";

import {
  EXPENSE_AMOUNT_MAX_PAISE,
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_NOTES_MAX_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
} from "./expense.constants";

export const expenseIdParams = z.object({ expenseId: objectId }).strict();

const title = z
  .string()
  .trim()
  .min(1, "Enter what the expense was for")
  .max(EXPENSE_TITLE_MAX_LENGTH, "Keep the title under 200 characters");

/** Money already spent or committed: at least 1 paisa, whole paise only. */
const amountPaise = z
  .number("Enter an amount")
  .int("Enter the amount in paise")
  .min(1, "Amount must be more than ₹0")
  .max(EXPENSE_AMOUNT_MAX_PAISE, "That is more than ₹100 crore");

const currency = z.enum(EXPENSE_CURRENCIES, "Only rupees (INR) are supported");

const expenseDate = z
  .string("Enter the date")
  .refine(isValidDateOnly, "Enter a date like 2026-09-01");

const category = z.enum(EXPENSE_CATEGORIES, "Choose a category");

/** null (or absent on create) means no event / no vendor. */
const eventId = objectId.nullable().optional();
const vendorId = objectId.nullable().optional();

const notes = z
  .string()
  .trim()
  .max(EXPENSE_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters")
  .nullable()
  .optional();

/** API_DESIGN §54. Currency defaults to INR, the only one. */
export const createExpenseSchema = z
  .object({
    title,
    amountPaise,
    currency: currency.default("INR"),
    expenseDate,
    category,
    eventId,
    vendorId,
    notes,
  })
  .strict();

/**
 * API_DESIGN §57: at least one field. `version` is the one last read: when it
 * is stale the update is refused with CONFLICT (decided 2026-11-18).
 */
export const updateExpenseSchema = z
  .object({
    title: title.optional(),
    amountPaise: amountPaise.optional(),
    currency: currency.optional(),
    expenseDate: expenseDate.optional(),
    category: category.optional(),
    eventId,
    vendorId,
    notes,
    version: z.number("Reload the expense and try again").int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "version"),
    "Send at least one field to change",
  );

/**
 * API_DESIGN §53: page + filters that combine with AND. `from` and `to` are
 * calendar days, both included.
 */
export const listExpensesQuerySchema = pageQuerySchema
  .extend({
    category: category.optional(),
    eventId: objectId.optional(),
    vendorId: objectId.optional(),
    from: expenseDate.optional(),
    to: expenseDate.optional(),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "The start date must be on or before the end date",
    path: ["to"],
  });
