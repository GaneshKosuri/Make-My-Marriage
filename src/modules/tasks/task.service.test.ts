import { describe, it } from "vitest";

/**
 * Test plan for tasksService (Phase 2: Planning). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("tasksService", () => {
  describe("tasks (API_DESIGN §34–38)", () => {
    it.todo("filters combine with AND; mine=true uses ctx.membershipId");
    it.todo("eventId=none and assignedMembershipId=none select unassigned tasks");
    it.todo("assignee and event must belong to the same wedding");
    it.todo("completedAt is set on COMPLETED and cleared when leaving it");
    it.todo("a stale version returns CONFLICT");
    it.todo("hard delete");
    it.todo("Wedding A Manager cannot modify a Wedding B task (SYSTEM_DESIGN §91)");
  });
});
