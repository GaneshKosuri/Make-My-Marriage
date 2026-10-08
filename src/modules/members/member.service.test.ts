import { describe, it } from "vitest";

/**
 * Test plan for membersService / memberInvitationService (Phase 1: Foundation). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("membersService / memberInvitationService", () => {
  describe("members (API_DESIGN §21, §27–28)", () => {
    it.todo("Managers can list members");
    it.todo("a wedding never ends with zero Admins (LAST_ADMIN) on demote or remove");
    it.todo("removed members lose access immediately");
    it.todo("cross-wedding membership ids → NOT_FOUND");
  });
  describe("invitations (API_DESIGN §22–26, DATABASE_DESIGN §86)", () => {
    it.todo("only one PENDING invitation per wedding + email");
    it.todo("stores only HMAC(member-invite) of the token");
    it.todo("expired invitations are rejected (TOKEN_EXPIRED)");
    it.todo("accept requires the signed-in email to match (INVITATION_EMAIL_MISMATCH)");
    it.todo("accept rejects users already in a wedding (ALREADY_HAS_WEDDING)");
    it.todo("concurrent accepts create exactly one membership (transaction)");
  });
});
