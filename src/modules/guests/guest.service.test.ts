import { describe, it } from "vitest";

/**
 * Test plan for guestsService / invitationService (Phase 3: Guests). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("guestsService / invitationService", () => {
  // Covered end to end:
  // - tests/integration/guests.test.ts: guest CRUD (API_DESIGN §39–43, §52), literal search, no
  //   token or emailNormalized in responses, capacity vs attendance, deleting a guest cancelling
  //   its pending EmailJobs.
  // - tests/integration/invitations.test.ts: the stable invitation link (§45), the public
  //   invitation (§50: one NOT_FOUND for malformed, unknown and deleted links and weddings; no
  //   ids, contacts or notes) and RSVP (§51: GUEST_LIMIT_EXCEEDED, PARTY_SIZE_CHANGED, CONFLICT,
  //   idempotent repeats, per-invitation limit consumed only after validation).
  // - tests/security/tenant-isolation.test.ts: a token can't expose another guest; a guest can't
  //   exceed the party size.
  describe("email (API_DESIGN §46–49)", () => {
    it.todo("send-invitation requires an email address");
    it.todo("bulk actions create one EmailJob per guest with a shared batchId");
  });
});
