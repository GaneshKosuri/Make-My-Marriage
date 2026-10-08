import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  CreateExpenseInput,
  ExpenseDto,
  ExpenseSummaryDto,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./expense.types";

/**
 * Expense tracker (PRD §9.15; SYSTEM_DESIGN §32; DATABASE_DESIGN §55–59; API_DESIGN §53–58). Phase 4.
 * Event/vendor references are validated through their modules' public APIs (DATABASE_DESIGN §109).
 */
export const expensesService = {
  /** API §53. */
  async list(ctx: MemberContext, query: ListExpensesQuery): Promise<PageResult<ExpenseDto>> {
    return notImplemented("API_DESIGN §53 (Phase 4: Financial & Vendors)");
  },

  /** createdByMembershipId = ctx.membershipId. API §54. */
  async create(ctx: MemberContext, input: CreateExpenseInput): Promise<ExpenseDto> {
    return notImplemented("API_DESIGN §54 (Phase 4: Financial & Vendors)");
  },

  /** Total + by-category breakdown; no budgets or variance. API §55. */
  async getSummary(ctx: MemberContext): Promise<ExpenseSummaryDto> {
    return notImplemented("API_DESIGN §55 (Phase 4: Financial & Vendors)");
  },

  /** API §56. */
  async get(ctx: MemberContext, expenseId: string): Promise<ExpenseDto> {
    return notImplemented("API_DESIGN §56 (Phase 4: Financial & Vendors)");
  },

  /** API §57. */
  async update(
    ctx: MemberContext,
    expenseId: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseDto> {
    return notImplemented("API_DESIGN §57 (Phase 4: Financial & Vendors)");
  },

  /** Hard delete. API §58. */
  async delete(ctx: MemberContext, expenseId: string): Promise<void> {
    return notImplemented("API_DESIGN §58 (Phase 4: Financial & Vendors)");
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard "Expenses: ₹12,45,000". */
  async totalForDashboard(weddingId: string): Promise<number> {
    return notImplemented("DATABASE_DESIGN §88 (Phase 1: Foundation — dashboard)");
  },
};
