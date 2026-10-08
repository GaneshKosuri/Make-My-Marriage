import "server-only";

/**
 * Expense document → DTO (API_DESIGN §53–58): amounts stay integer paise,
 * expenseDate rendered as YYYY-MM-DD, event/vendor summaries embedded.
 *
 * TODO(Phase 4: Financial & Vendors): toExpenseDto(record, events, vendors).
 */
export {};
