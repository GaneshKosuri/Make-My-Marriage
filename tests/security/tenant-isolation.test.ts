import { describe, it } from "vitest";

/**
 * Critical security tests — SYSTEM_DESIGN §91. One case per documented
 * requirement; each becomes a real test (against the API route handlers and a
 * real database) in the phase that implements the feature. Cross-tenant
 * access must look like NOT_FOUND, never FORBIDDEN (API_DESIGN §96).
 */
describe("critical security tests (SYSTEM_DESIGN §91)", () => {
  it.todo("Wedding A user cannot fetch Wedding B event (Phase 2: GET /api/events/:id → 404)");
  it.todo("Wedding A Manager cannot modify Wedding B task (Phase 2: PATCH /api/tasks/:id → 404)");
  it.todo(
    "Manager cannot manage Wedding Members (Phase 1: invitations, role changes, removal → 403; route level already covered in tests/integration/auth-levels.test.ts)",
  );
  it.todo("Guest token cannot expose another guest (Phase 3: GET /api/public/invitations/:token)");
  it.todo(
    "Guest cannot exceed allowed attendee count (Phase 3: POST …/rsvp → GUEST_LIMIT_EXCEEDED)",
  );
  it.todo(
    "Invalid gallery token cannot upload (Phase 6: POST /api/public/galleries/:token/upload-url → 404)",
  );
  it.todo(
    "Expired reset token cannot reset password (Phase 1: POST /api/auth/reset-password → TOKEN_EXPIRED)",
  );
});
