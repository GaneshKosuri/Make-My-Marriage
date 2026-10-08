import { describe, it } from "vitest";

/**
 * Test plan for eventsService (Phase 2: Planning). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("eventsService", () => {
  describe("events (API_DESIGN §29–33)", () => {
    it.todo("lists startsAt ASC, excluding archived by default");
    it.todo("requires endsAt > startsAt after merging a partial update");
    it.todo("archived events are read-only");
    it.todo("a stale version returns CONFLICT");
    it.todo("DELETE archives instead of deleting");
    it.todo("another wedding's event → NOT_FOUND");
  });
  describe("assertActiveEventsInWedding (DATABASE_DESIGN §83)", () => {
    it.todo("rejects archived events and events from another wedding");
  });
});
