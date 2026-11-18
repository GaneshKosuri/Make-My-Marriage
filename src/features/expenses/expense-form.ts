/**
 * The add/edit expense form (PRD §9.15): what it was for, the amount in
 * rupees, the day, a category, and optionally the event and vendor. Blank
 * notes mean "not set"; "" event or vendor means none.
 */
import { z } from "zod";

import { isValidDateOnly } from "@/lib/dates";
import { formatRupeesInput, parseRupeesInput } from "@/lib/money";
import {
  EXPENSE_AMOUNT_MAX_PAISE,
  EXPENSE_CATEGORIES,
  EXPENSE_NOTES_MAX_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
  type ExpenseCategory,
} from "@/modules/expenses/expense.constants";
import type { createExpenseSchema, updateExpenseSchema } from "@/modules/expenses/expense.schemas";
import type { ExpenseDto } from "@/modules/expenses/expense.types";
import type { VendorCategory } from "@/modules/vendors/vendor.constants";

import { EXPENSES } from "./expenses-content";

const FIELDS = EXPENSES.form.fields;

/** The expense category a vendor's work usually falls under, to pre-fill the form. */
export const EXPENSE_CATEGORY_FOR_VENDOR: Readonly<Record<VendorCategory, ExpenseCategory>> = {
  PHOTOGRAPHER: "PHOTOGRAPHY",
  VIDEOGRAPHER: "VIDEOGRAPHY",
  VENUE: "VENUE",
  CATERER: "CATERING",
  DECORATOR: "DECORATION",
  DJ: "ENTERTAINMENT",
  MAKEUP_ARTIST: "MAKEUP",
  MEHENDI_ARTIST: "MAKEUP",
  PANDIT: "OTHER",
  CHOREOGRAPHER: "ENTERTAINMENT",
  FLORIST: "DECORATION",
  WEDDING_PLANNER: "OTHER",
  TRANSPORT: "TRAVEL",
  OTHER: "OTHER",
};

export const expenseFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter what the expense was for")
      .max(EXPENSE_TITLE_MAX_LENGTH, "Keep the title under 200 characters"),
    amount: z
      .string()
      .trim()
      .refine((value) => parseRupeesInput(value) !== null, FIELDS.amount.invalid)
      .refine((value) => (parseRupeesInput(value) ?? 1) > 0, FIELDS.amount.zero)
      .refine(
        (value) => (parseRupeesInput(value) ?? 0) <= EXPENSE_AMOUNT_MAX_PAISE,
        "That is more than ₹100 crore",
      ),
    expenseDate: z.string().refine(isValidDateOnly, "Enter the date"),
    // "" until one is chosen.
    category: z.union([z.literal(""), z.enum(EXPENSE_CATEGORIES)]).refine(Boolean, {
      message: "Choose a category",
    }),
    eventId: z.string(),
    vendorId: z.string(),
    notes: z.string().trim().max(EXPENSE_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters"),
  })
  .strict();

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
type ParsedExpenseForm = z.output<typeof expenseFormSchema>;
export type CreateExpenseBody = z.input<typeof createExpenseSchema>;
export type UpdateExpenseBody = z.input<typeof updateExpenseSchema>;

/** API field names for VALIDATION_ERROR details → the form's fields. */
export const EXPENSE_SERVER_FIELDS = {
  title: "title",
  amountPaise: "amount",
  expenseDate: "expenseDate",
  category: "category",
  eventId: "eventId",
  vendorId: "vendorId",
  notes: "notes",
} as const satisfies Record<string, keyof ExpenseFormValues>;

/** A new expense: today (in the wedding's time zone), optionally for a vendor already chosen. */
export function emptyExpenseForm(
  today: string,
  vendor?: { id: string; category: VendorCategory },
): ExpenseFormValues {
  return {
    title: "",
    amount: "",
    expenseDate: today,
    category: vendor ? EXPENSE_CATEGORY_FOR_VENDOR[vendor.category] : "",
    eventId: "",
    vendorId: vendor?.id ?? "",
    notes: "",
  };
}

export function expenseToForm(expense: ExpenseDto): ExpenseFormValues {
  return {
    title: expense.title,
    amount: formatRupeesInput(expense.amountPaise),
    expenseDate: expense.expenseDate,
    category: expense.category,
    eventId: expense.event?.id ?? "",
    vendorId: expense.vendor?.id ?? "",
    notes: expense.notes ?? "",
  };
}

const paise = (amount: string) => parseRupeesInput(amount) ?? 0;

/** POST /api/expenses body (API_DESIGN §54). */
export function toCreateExpenseBody(values: ParsedExpenseForm): CreateExpenseBody {
  return {
    title: values.title,
    amountPaise: paise(values.amount),
    expenseDate: values.expenseDate,
    // The schema refused "" already.
    category: values.category as ExpenseCategory,
    eventId: values.eventId || null,
    vendorId: values.vendorId || null,
    notes: values.notes || null,
  };
}

/**
 * PATCH /api/expenses/:id body (API_DESIGN §57): only what differs from the
 * values the form opened with, plus the version they were read at. Null when
 * nothing changed.
 */
export function toUpdateExpenseBody(
  values: ParsedExpenseForm,
  initial: ExpenseFormValues,
  version: number,
): UpdateExpenseBody | null {
  const body: UpdateExpenseBody = {};
  if (values.title !== initial.title.trim()) body.title = values.title;
  if (paise(values.amount) !== paise(initial.amount)) body.amountPaise = paise(values.amount);
  if (values.expenseDate !== initial.expenseDate) body.expenseDate = values.expenseDate;
  if (values.category !== initial.category && values.category) body.category = values.category;
  if (values.eventId !== initial.eventId) body.eventId = values.eventId || null;
  if (values.vendorId !== initial.vendorId) body.vendorId = values.vendorId || null;
  if (values.notes !== initial.notes.trim()) body.notes = values.notes || null;
  return Object.keys(body).length > 0 ? { ...body, version } : null;
}
