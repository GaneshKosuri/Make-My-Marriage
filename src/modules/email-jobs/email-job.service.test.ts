import { describe, it } from "vitest";

/**
 * Test plan for emailJobsService / emailJobWorker (Phase 3: Guests). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("emailJobsService / emailJobWorker", () => {
  describe("worker (SYSTEM_DESIGN §49–54, DATABASE_DESIGN §72–74)", () => {
    it.todo("claims jobs atomically so overlapping runs never double-send");
    it.todo("recovers PROCESSING jobs whose lock is stale");
    it.todo("retries after 5 and 30 minutes, then marks FAILED");
    it.todo("sends with the job's idempotency key");
  });
  describe("batches (API_DESIGN §85–86)", () => {
    it.todo("batch status counts jobs by status for the current wedding only");
    it.todo("retry-failed re-queues FAILED jobs");
  });
});
