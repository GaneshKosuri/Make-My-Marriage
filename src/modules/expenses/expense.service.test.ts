import { describe, it } from "vitest";

/**
 * Test plan for expensesService (Phase 4: Financial & Vendors). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("expensesService", () => {
  describe("expenses (API_DESIGN §53–58)", () => {
    it.todo("amounts are integer paise");
    it.todo("createdByMembershipId comes from ctx");
    it.todo("event and vendor must belong to the same wedding");
    it.todo("summary totals by category with no budget maths");
    it.todo("hard delete");
  });
});
