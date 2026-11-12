import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getEvent } from "@/app/api/events/[eventId]/route";
import { DELETE as deleteGuest } from "@/app/api/guests/[guestId]/route";
import { POST as submitRsvp } from "@/app/api/public/invitations/[token]/rsvp/route";
import { GET as publicInvitation } from "@/app/api/public/invitations/[token]/route";
import { PATCH as updateTask } from "@/app/api/tasks/[taskId]/route";
import { EventModel } from "@/modules/events/event.model";
import { GuestModel } from "@/modules/guests/guest.model";
import { TaskModel } from "@/modules/tasks/task.model";

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
  it("Wedding A Manager cannot modify Wedding B task (PATCH /api/tasks/:id → 404)", async () => {
    const owner = await createUser();
    const weddingA = await createWedding(owner._id);
    const weddingB = await createWedding(owner._id);
    const managerA = await signedInUser({ wedding: weddingA, role: "MANAGER" });
    const taskB = await TaskModel.create({ weddingId: weddingB._id, title: "Book the band" });
    const taskId = taskB._id.toString();

    const response = await updateTask(
      new NextRequest(`${TEST_APP_URL}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          cookie: managerA.cookie,
          origin: TEST_APP_URL,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "COMPLETED" }),
      }),
      { params: Promise.resolve({ taskId }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    const after = await TaskModel.findOne({ _id: taskB._id, weddingId: weddingB._id }).lean();
    expect(after).toMatchObject({ status: "TODO", __v: 0 });
  });
  it("Wedding A Manager cannot delete Wedding B guest (DELETE /api/guests/:id → 404)", async () => {
    const owner = await createUser();
    const weddingA = await createWedding(owner._id);
    const weddingB = await createWedding(owner._id);
    const managerA = await signedInUser({ wedding: weddingA, role: "MANAGER" });
    const guestB = await GuestModel.create({
      weddingId: weddingB._id,
      name: "Rajesh Sharma",
      invitationToken: "t".repeat(43),
    });
    const guestId = guestB._id.toString();

    const response = await deleteGuest(
      new NextRequest(`${TEST_APP_URL}/api/guests/${guestId}`, {
        method: "DELETE",
        headers: { cookie: managerA.cookie, origin: TEST_APP_URL },
      }),
      { params: Promise.resolve({ guestId }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(await GuestModel.countDocuments({ _id: guestB._id, weddingId: weddingB._id })).toBe(1);
  });
  it.todo(
    "Manager cannot manage Wedding Members (Phase 1: invitations, role changes, removal → 403; route level already covered in tests/integration/auth-levels.test.ts)",
  );
  it("Guest token cannot expose another guest (GET /api/public/invitations/:token)", async () => {
    const owner = await createUser();
    const wedding = await createWedding(owner._id);
    const tokenA = "a".repeat(43);
    await GuestModel.create([
      { weddingId: wedding._id, name: "Rajesh Sharma", invitationToken: tokenA, notes: "Uncle" },
      {
        weddingId: wedding._id,
        name: "Meera Iyer",
        email: "meera@example.com",
        invitationToken: "b".repeat(43),
      },
    ]);

    const response = await publicInvitation(
      new NextRequest(`${TEST_APP_URL}/api/public/invitations/${tokenA}`),
      { params: Promise.resolve({ token: tokenA }) },
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Rajesh Sharma");
    for (const leak of ["Meera", "meera@example.com", "b".repeat(43), "Uncle", tokenA]) {
      expect(text).not.toContain(leak);
    }
  });
  it("Guest cannot exceed allowed attendee count (POST …/rsvp → GUEST_LIMIT_EXCEEDED)", async () => {
    const owner = await createUser();
    const wedding = await createWedding(owner._id);
    const token = "c".repeat(43);
    const guest = await GuestModel.create({
      weddingId: wedding._id,
      name: "Rajesh Sharma",
      maxGuests: 4,
      invitationToken: token,
    });

    const response = await submitRsvp(
      new NextRequest(`${TEST_APP_URL}/api/public/invitations/${token}/rsvp`, {
        method: "POST",
        headers: { origin: TEST_APP_URL, "content-type": "application/json" },
        body: JSON.stringify({ status: "ATTENDING", attendingCount: 5 }),
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "GUEST_LIMIT_EXCEEDED" } });
    const after = await GuestModel.findOne({ _id: guest._id, weddingId: wedding._id }).lean();
    expect(after).toMatchObject({ rsvpStatus: "PENDING", attendingCount: null, __v: 0 });
  });
  it.todo(
    "Invalid gallery token cannot upload (Phase 6: POST /api/public/galleries/:token/upload-url → 404)",
  );
  it.todo(
    "Expired reset token cannot reset password (Phase 1: POST /api/auth/reset-password → TOKEN_EXPIRED)",
  );
});
