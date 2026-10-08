import { describe, it } from "vitest";

/**
 * Test plan for authService (Phase 1: Foundation). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("authService", () => {
  describe("signup (API_DESIGN §11)", () => {
    it.todo("normalises email and rejects duplicates with EMAIL_ALREADY_EXISTS");
    it.todo("stores only an argon2id hash, never the password");
    it.todo("creates a session and reports hasWedding=false");
  });
  describe("login (API_DESIGN §12)", () => {
    it.todo("returns the same generic error for unknown email and wrong password");
    it.todo("burns equivalent hashing work for unknown emails (timing)");
    it.todo("creates a session and reports hasWedding");
  });
  describe("logout / me (API_DESIGN §13–14)", () => {
    it.todo("destroys only the current session");
    it.todo("me returns membership and wedding summary, or nulls without a wedding");
  });
  describe("password reset (API_DESIGN §15–16, SYSTEM_DESIGN §91)", () => {
    it.todo("forgot-password always succeeds outwardly and emails only existing accounts");
    it.todo("stores only the HMAC(password-reset) of the token");
    it.todo("expired reset token cannot reset the password (TOKEN_EXPIRED)");
    it.todo("a used token cannot be reused");
    it.todo("resetting revokes the user's other sessions");
  });
});
