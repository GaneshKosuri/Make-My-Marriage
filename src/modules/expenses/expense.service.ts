import "server-only";

import { dateOnlyToUtcDate } from "@/lib/dates";
import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { buildPagePagination } from "@/server/http/pagination";
import { logger } from "@/server/logging/logger";

import { eventsService } from "@/modules/events";
import { vendorsService } from "@/modules/vendors";

import { toExpenseDto } from "./expense.mapper";
import type { ExpenseRecord } from "./expense.model";
import { expenseRepository, type ExpenseFields } from "./expense.repository";
import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseSummaryDto,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./expense.types";

/** Blank optional text is stored as null ("not set"). */
const orNull = (value: string | null | undefined) => value || null;

/**
 * A newly linked event or vendor must be active and of this wedding
 * (DATABASE_DESIGN §57); one the expense already links may stay even if it
 * was archived since. Unknown, archived and other weddings' records look the
 * same: a field error, never another wedding's 403.
 */
async function assertNewLinks(
  weddingId: string,
  links: { eventId?: string | null; vendorId?: string | null },
  current?: ExpenseRecord,
): Promise<void> {
  const { eventId, vendorId } = links;
  if (eventId && eventId !== current?.eventId?.toString()) {
    await eventsService.assertActiveEventsInWedding(weddingId, [eventId], "eventId");
  }
  if (vendorId && vendorId !== current?.vendorId?.toString()) {
    await vendorsService.assertActiveVendorInWedding(weddingId, vendorId, "vendorId");
  }
}

/**
 * Expense tracker (PRD §9.15; SYSTEM_DESIGN §32; DATABASE_DESIGN §55–59; API_DESIGN §53–58).
 * Records money already spent or committed. Not a budget: no limits, balances or variance.
 */
export const expensesService = {
  /** Newest date first; category, event, vendor and date filters combine with AND. API §53. */
  async list(ctx: MemberContext, query: ListExpensesQuery): Promise<PageResult<ExpenseDto>> {
    const page = { page: query.page, limit: query.limit };
    const { items, total } = await expenseRepository.list(
      ctx.weddingId,
      {
        category: query.category,
        eventId: query.eventId,
        vendorId: query.vendorId,
        from: query.from ? dateOnlyToUtcDate(query.from) : undefined,
        to: query.to ? dateOnlyToUtcDate(query.to) : undefined,
      },
      page,
    );
    return {
      items: await toExpenseDtos(ctx.weddingId, items),
      pagination: buildPagePagination(total, page),
    };
  },

  /** createdByMembershipId = ctx.membershipId. API §54. */
  async create(ctx: MemberContext, input: CreateExpenseInput): Promise<ExpenseDto> {
    await assertNewLinks(ctx.weddingId, input);
    const expense = await expenseRepository.create(ctx.weddingId, {
      title: input.title,
      amountPaise: input.amountPaise,
      currency: input.currency,
      expenseDate: dateOnlyToUtcDate(input.expenseDate),
      category: input.category,
      eventId: input.eventId ?? null,
      vendorId: input.vendorId ?? null,
      notes: orNull(input.notes),
      createdByMembershipId: ctx.membershipId,
    });
    logger.info("Expense created", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      expenseId: expense._id.toString(),
    });
    return toSingleDto(ctx.weddingId, expense);
  },

  /** The total and the amount per category, largest first. No budget maths. API §55. */
  async getSummary(ctx: MemberContext): Promise<ExpenseSummaryDto> {
    const { total, byCategory } = await expenseRepository.sumByCategory(ctx.weddingId);
    return { totalExpensePaise: total, currency: "INR", byCategory };
  },

  /** `_id + weddingId`; cross-wedding → NOT_FOUND. API §56. */
  async get(ctx: MemberContext, expenseId: string): Promise<ExpenseDto> {
    const expense = await expenseRepository.findById(ctx.weddingId, expenseId);
    if (!expense) throw new AppError("NOT_FOUND");
    return toSingleDto(ctx.weddingId, expense);
  },

  /**
   * Partial. A stale `version`, or another write between our read and update,
   * is CONFLICT. The person who added it never changes. API §57.
   */
  async update(
    ctx: MemberContext,
    expenseId: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto> {
    const current = await expenseRepository.findById(ctx.weddingId, expenseId);
    if (!current) throw new AppError("NOT_FOUND");
    if (input.version !== undefined && input.version !== current.__v) {
      throw new AppError("CONFLICT");
    }
    await assertNewLinks(ctx.weddingId, input, current);

    const changes: Partial<ExpenseFields> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.amountPaise !== undefined) changes.amountPaise = input.amountPaise;
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.expenseDate !== undefined) {
      changes.expenseDate = dateOnlyToUtcDate(input.expenseDate);
    }
    if (input.category !== undefined) changes.category = input.category;
    if (input.eventId !== undefined) changes.eventId = input.eventId;
    if (input.vendorId !== undefined) changes.vendorId = input.vendorId;
    if (input.notes !== undefined) changes.notes = orNull(input.notes);

    const updated = await expenseRepository.updateVersioned(
      ctx.weddingId,
      expenseId,
      current.__v,
      changes,
    );
    if (!updated) {
      const exists = await expenseRepository.findById(ctx.weddingId, expenseId);
      throw new AppError(exists ? "CONFLICT" : "NOT_FOUND");
    }
    logger.info("Expense updated", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      expenseId,
    });
    return toSingleDto(ctx.weddingId, updated);
  },

  /** Hard delete (DATABASE_DESIGN §59). API §58. */
  async delete(ctx: MemberContext, expenseId: string): Promise<void> {
    if (!(await expenseRepository.delete(ctx.weddingId, expenseId))) {
      throw new AppError("NOT_FOUND");
    }
    logger.info("Expense deleted", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      expenseId,
    });
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard "Expenses: ₹12,45,000". */
  async totalForDashboard(weddingId: string): Promise<number> {
    return expenseRepository.sumTotal(weddingId);
  },
};

/** Resolves linked event and vendor summaries (archived ones included) in two batched lookups. */
async function toExpenseDtos(
  weddingId: string,
  expenses: readonly ExpenseRecord[],
): Promise<ExpenseDto[]> {
  if (expenses.length === 0) return [];
  const eventIds = expenses.flatMap((expense) =>
    expense.eventId ? [expense.eventId.toString()] : [],
  );
  const vendorIds = expenses.flatMap((expense) =>
    expense.vendorId ? [expense.vendorId.toString()] : [],
  );
  const [events, vendors] = await Promise.all([
    eventIds.length > 0 ? eventsService.findSummaries(weddingId, eventIds) : new Map(),
    vendorIds.length > 0 ? vendorsService.findSummaries(weddingId, vendorIds) : new Map(),
  ]);
  return expenses.map((expense) => toExpenseDto(expense, events, vendors));
}

async function toSingleDto(weddingId: string, expense: ExpenseRecord): Promise<ExpenseDto> {
  const [dto] = await toExpenseDtos(weddingId, [expense]);
  return dto!;
}
