import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getEvent } from "@/app/api/events/[eventId]/route";
import { EventModel } from "@/modules/events/event.model";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/**
 * Critical security tests — SYSTEM_DESIGN §91. One case per documented
 * requirement; each becomes a real test (against the API route handlers and a
 * real database) in the phase that implements the feature. Cross-tenant
 * access must look like NOT_FOUND, never FORBIDDEN (API_DESIGN §96).
 */
describe("critical security tests (SYSTEM_DESIGN §91)", () => {
  it("Wedding A user cannot fetch Wedding B event (GET /api/events/:id → 404)", async () => {
    const owner = await createUser();
    const weddingA = await createWedding(owner._id);
    const weddingB = await createWedding(owner._id);
    const userA = await signedInUser({ wedding: weddingA, role: "ADMIN" });
    const eventB = await EventModel.create({
      weddingId: weddingB._id,
      name: "Sangeet",
      startsAt: new Date("2027-02-11T13:30:00Z"),
    });

    const response = await getEvent(
      new NextRequest(`${TEST_APP_URL}/api/events/${eventB._id.toString()}`, {
        headers: { cookie: userA.cookie },
      }),
      { params: Promise.resolve({ eventId: eventB._id.toString() }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
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
