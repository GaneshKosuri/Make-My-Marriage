import { describe, it } from "vitest";

/**
 * Test plan for guestsService / invitationService (Phase 3: Guests). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("guestsService / invitationService", () => {
  describe("guests (API_DESIGN §39–43)", () => {
    it.todo("search is literal and case-insensitive (regex escaped)");
    it.todo("never returns invitationToken or emailNormalized");
    it.todo("rejects capacity below recorded attendance");
    it.todo("deleting a guest cancels its pending EmailJobs and invalidates the link");
  });
  describe("sharing and email (API_DESIGN §44–49)", () => {
    it.todo("the invitation link is stable across calls");
    it.todo("send-invitation requires an email address");
    it.todo("bulk actions create one EmailJob per guest with a shared batchId");
  });
  describe("public invitation + RSVP (API_DESIGN §50–51, SYSTEM_DESIGN §91)", () => {
    it.todo("malformed, unknown and deleted links all return the same NOT_FOUND");
    it.todo("a guest token cannot expose another guest");
    it.todo("a guest cannot exceed the allowed attendee count (GUEST_LIMIT_EXCEEDED)");
    it.todo("reduced capacity returns PARTY_SIZE_CHANGED");
    it.todo("rate limits are consumed after validation: per-invitation, then global");
    it.todo("identical repeats are idempotent");
  });
});
