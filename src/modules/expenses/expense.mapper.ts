import "server-only";

import { utcDateToDateOnly } from "@/lib/dates";
import type { EventSummaryDto } from "@/modules/events/event.types";
import type { VendorSummaryDto } from "@/modules/vendors/vendor.types";

import type { ExpenseRecord } from "./expense.model";
import type { ExpenseDto } from "./expense.types";

/**
 * Expense document → DTO (API_DESIGN §53–58): amounts stay integer paise,
 * expenseDate is rendered as YYYY-MM-DD, event and vendor summaries are
 * embedded (archived ones included; one that no longer exists shows as none).
 * Who added it is kept for the record but not returned.
 */
export function toExpenseDto(
  expense: ExpenseRecord,
  events: ReadonlyMap<string, EventSummaryDto>,
  vendors: ReadonlyMap<string, VendorSummaryDto>,
): ExpenseDto {
  return {
    id: expense._id.toString(),
    title: expense.title,
    amountPaise: expense.amountPaise,
    currency: expense.currency,
    expenseDate: utcDateToDateOnly(expense.expenseDate),
    category: expense.category,
    event: expense.eventId ? (events.get(expense.eventId.toString()) ?? null) : null,
    vendor: expense.vendorId ? (vendors.get(expense.vendorId.toString()) ?? null) : null,
    notes: expense.notes ?? null,
    version: expense.__v,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
