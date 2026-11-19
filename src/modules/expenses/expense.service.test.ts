import { describe, it } from "vitest";

/**
 * Test plan for expensesService (Phase 4: Financial & Vendors).
 *
 * Covered end to end in tests/integration/expenses.test.ts: expense CRUD (API_DESIGN §53–58),
 * integer paise, createdByMembershipId from the session, event and vendor links active and of
 * this wedding (archived links an expense already has stay), date filters with both ends
 * included, the summary by category (no budget figures) and the dashboard total, versioned
 * updates (CONFLICT), hard delete, cross-wedding 404s.
 */
describe("expensesService", () => {
  it.todo("vendor page: expenses recorded for one vendor (slice 4)");
});
