import { randomBytes } from "node:crypto";

import { Types } from "mongoose";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  DELETE as deleteGuest,
  GET as getGuest,
  PATCH as updateGuest,
} from "@/app/api/guests/[guestId]/route";
import { GET as rsvpSummary } from "@/app/api/guests/rsvp-summary/route";
import { GET as listGuests, POST as createGuest } from "@/app/api/guests/route";
import type { EmailJobStatus } from "@/modules/email-jobs/email-job.constants";
import { EmailJobModel } from "@/modules/email-jobs/email-job.model";
import { EventModel } from "@/modules/events/event.model";
import { GuestModel } from "@/modules/guests/guest.model";
import { TOKEN_PATTERN } from "@/server/security/tokens";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** Guests end to end through the route handlers (PRD §9.7–9.8, API_DESIGN §39–43, §52). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type GuestBody = Record<string, unknown> & {
  id: string;
  name: string;
  version: number;
  invitedEvents: { id: string; name: string; archivedAt: string | null }[];
};

const YEAR = new Date().getUTCFullYear() + 1;

async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    query = "",
    body,
    cookie,
  }: {
    method?: string;
    params?: Record<string, string>;
    query?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/guests${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/** A wedding with a signed-in Manager, two active events and an archived one. */
async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  const admin = await signedInUser({ wedding, role: "ADMIN" });
  const [haldi, wedding_, roka] = await EventModel.create([
    { weddingId: wedding._id, name: "Haldi", startsAt: new Date(`${YEAR}-02-13T03:30:00Z`) },
    { weddingId: wedding._id, name: "Wedding", startsAt: new Date(`${YEAR}-02-14T14:30:00Z`) },
    {
      weddingId: wedding._id,
      name: "Roka",
      startsAt: new Date(`${YEAR}-01-01T12:00:00Z`),
      archivedAt: new Date(),
    },
  ]);
  return {
    wedding,
    cookie: manager.cookie,
    adminCookie: admin.cookie,
    haldi: haldi!._id.toString(),
    weddingEvent: wedding_!._id.toString(),
    archived: roka!._id.toString(),
  };
}

async function create(cookie: string, body: Record<string, unknown>) {
  const result = await call(createGuest, { method: "POST", body, cookie });
  expect(result.status).toBe(201);
  return result.body.data as GuestBody;
}

const patch = (cookie: string, guestId: string, body: unknown) =>
  call(updateGuest, { method: "PATCH", params: { guestId }, body, cookie });

const list = (cookie: string, query = "") => call(listGuests, { query, cookie });

const names = (body: ApiBody) => (body.data as GuestBody[]).map((guest) => guest.name);

// Test-only reads straight from the collection, including the secret.
const stored = (id: string) =>
  GuestModel.findById(id).select("+invitationToken").setOptions({ tenantScoped: false }).lean();

/** Records an RSVP directly (the public RSVP endpoint arrives in slice 3). */
const recordRsvp = (id: string, attendingCount: number) =>
  GuestModel.updateOne(
    { _id: id },
    {
      $set: { rsvpStatus: "ATTENDING", attendingCount, rsvpUpdatedAt: new Date() },
      $inc: { __v: 1 },
    },
  ).setOptions({ tenantScoped: false });

describe("POST /api/guests", () => {
  it("creates an invitation with its events, pending RSVP and a hidden token", async () => {
    const { cookie, haldi, weddingEvent } = await setup();
    const guest = await create(cookie, {
      name: "  Rajesh Sharma ",
      email: " Rajesh@Example.com ",
      phone: "+91 98765 43210",
      maxGuests: 4,
      invitedEventIds: [weddingEvent, haldi, weddingEvent],
      notes: "Family friend",
    });

    expect(guest).toEqual({
      id: expect.any(String),
      name: "Rajesh Sharma",
      email: "Rajesh@Example.com",
      phone: "+91 98765 43210",
      maxGuests: 4,
      invitedEvents: [
        { id: weddingEvent, name: "Wedding", startsAt: expect.any(String), archivedAt: null },
        { id: haldi, name: "Haldi", startsAt: expect.any(String), archivedAt: null },
      ],
      notes: "Family friend",
      rsvpStatus: "PENDING",
      attendingCount: null,
      rsvpUpdatedAt: null,
      invitationSentAt: null,
      lastReminderSentAt: null,
      reminderCount: 0,
      version: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    const record = await stored(guest.id);
    expect(record?.invitationToken).toMatch(TOKEN_PATTERN);
    expect(record?.emailNormalized).toBe("rajesh@example.com");
    expect(JSON.stringify(guest)).not.toContain(record!.invitationToken);
  });

  it("needs only a name: party of 1, no events, blank contacts stored as not set", async () => {
    const { cookie } = await setup();
    expect(await create(cookie, { name: "Meera", email: "", phone: " " })).toMatchObject({
      maxGuests: 1,
      invitedEvents: [],
      email: null,
      phone: null,
      notes: null,
    });
  });

  it("gives every guest a different token", async () => {
    const { cookie } = await setup();
    const a = await create(cookie, { name: "A" });
    const b = await create(cookie, { name: "B" });
    expect((await stored(a.id))?.invitationToken).not.toBe((await stored(b.id))?.invitationToken);
  });

  it.each([
    [{ name: " " }, "name"],
    [{ name: "x".repeat(121) }, "name"],
    [{ name: "Ravi", email: "ravi@" }, "email"],
    [{ name: "Ravi", phone: "call me" }, "phone"],
    [{ name: "Ravi", maxGuests: 0 }, "maxGuests"],
    [{ name: "Ravi", maxGuests: 2.5 }, "maxGuests"],
    [{ name: "Ravi", maxGuests: 10_001 }, "maxGuests"],
    [{ name: "Ravi", invitedEventIds: ["abc"] }, "invitedEventIds.0"],
    [{ name: "Ravi", notes: "x".repeat(2001) }, "notes"],
  ])("rejects invalid input (%#: %o)", async (body, field) => {
    const { cookie } = await setup();
    const result = await call(createGuest, { method: "POST", body, cookie });
    expect(result.status).toBe(400);
    expect(result.body.error?.details).toHaveProperty([field]);
  });

  it.each([
    ["weddingId", randomBytes(12).toString("hex")],
    ["rsvpStatus", "ATTENDING"],
    ["attendingCount", 2],
    ["invitationToken", "a".repeat(43)],
    ["invitationSentAt", new Date().toISOString()],
  ])("rejects a client-supplied %s", async (field, value) => {
    const { cookie } = await setup();
    const result = await call(createGuest, {
      method: "POST",
      body: { name: "Ravi", [field]: value },
      cookie,
    });
    expect(result.status).toBe(400);
  });

  it("refuses an archived event or another wedding's event", async () => {
    const { cookie, archived, wedding } = await setup();
    const other = await setup();
    for (const eventId of [archived, other.haldi]) {
      const result = await call(createGuest, {
        method: "POST",
        body: { name: "Ravi", invitedEventIds: [eventId] },
        cookie,
      });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toHaveProperty("invitedEventIds");
    }
    expect(await GuestModel.countDocuments({ weddingId: wedding._id })).toBe(0);
  });
});

describe("GET /api/guests", () => {
  it("lists by name ignoring case, then pages", async () => {
    const { cookie } = await setup();
    for (const name of ["zara", "Anita", "bhavna", "Chetan"]) await create(cookie, { name });

    const first = await list(cookie, "?limit=3");
    expect(names(first.body)).toEqual(["Anita", "bhavna", "Chetan"]);
    expect(first.body.pagination).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2 });
    expect(names((await list(cookie, "?limit=3&page=2")).body)).toEqual(["zara"]);
  });

  it("searches name, email and phone literally and case-insensitively", async () => {
    const { cookie } = await setup();
    await create(cookie, { name: "Rajesh Sharma", email: "raj@example.com" });
    await create(cookie, { name: "Priya", phone: "+91 99887 76655" });
    await create(cookie, { name: "Abc", email: "abc@example.com" });

    expect(names((await list(cookie, "?search=SHARMA")).body)).toEqual(["Rajesh Sharma"]);
    expect(names((await list(cookie, "?search=RAJ%40EXAMPLE")).body)).toEqual(["Rajesh Sharma"]);
    expect(names((await list(cookie, "?search=99887")).body)).toEqual(["Priya"]);
    // "." and "+" are plain characters, not patterns.
    expect(names((await list(cookie, "?search=a.c")).body)).toEqual([]);
    expect(names((await list(cookie, "?search=%2B91")).body)).toEqual(["Priya"]);
    expect(names((await list(cookie, "?search=%20")).body)).toHaveLength(3);
  });

  it("filters by RSVP, event and whether the invitation was sent, combined", async () => {
    const { cookie, haldi, weddingEvent } = await setup();
    const asha = await create(cookie, { name: "Asha", invitedEventIds: [haldi], maxGuests: 2 });
    await create(cookie, { name: "Bina", invitedEventIds: [haldi, weddingEvent] });
    const chitra = await create(cookie, { name: "Chitra", invitedEventIds: [weddingEvent] });
    await recordRsvp(asha.id, 2);
    await GuestModel.updateOne({ _id: chitra.id }, { invitationSentAt: new Date() }).setOptions({
      tenantScoped: false,
    });

    expect(names((await list(cookie, `?eventId=${haldi}`)).body)).toEqual(["Asha", "Bina"]);
    expect(names((await list(cookie, "?rsvpStatus=PENDING")).body)).toEqual(["Bina", "Chitra"]);
    expect(names((await list(cookie, `?rsvpStatus=PENDING&eventId=${haldi}`)).body)).toEqual([
      "Bina",
    ]);
    expect(names((await list(cookie, "?invitationSent=true")).body)).toEqual(["Chitra"]);
    expect(names((await list(cookie, "?invitationSent=false")).body)).toEqual(["Asha", "Bina"]);
  });

  it("shows only this wedding's guests", async () => {
    const { cookie } = await setup();
    const other = await setup();
    await create(other.cookie, { name: "Someone else's guest" });
    await create(cookie, { name: "Ours" });
    expect(names((await list(cookie)).body)).toEqual(["Ours"]);
  });

  it.each(["?rsvpStatus=MAYBE", "?eventId=abc", "?invitationSent=yes", "?limit=101", "?sort=name"])(
    "rejects a bad query (%s)",
    async (query) => {
      const { cookie } = await setup();
      expect((await list(cookie, query)).status).toBe(400);
    },
  );
});

describe("GET /api/guests/:guestId", () => {
  it("returns the guest, and 404 for another wedding's guest or an unknown id", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const ours = await create(cookie, { name: "Ours" });
    const theirs = await create(other.cookie, { name: "Theirs" });

    const found = await call(getGuest, { params: { guestId: ours.id }, cookie });
    expect(found.status).toBe(200);
    expect(found.body.data).toMatchObject({ id: ours.id, name: "Ours" });

    for (const guestId of [theirs.id, randomBytes(12).toString("hex")]) {
      const missing = await call(getGuest, { params: { guestId }, cookie });
      expect(missing.status).toBe(404);
      expect(missing.body.error?.code).toBe("NOT_FOUND");
    }
    expect((await call(getGuest, { params: { guestId: "abc" }, cookie })).status).toBe(400);
  });
});

describe("PATCH /api/guests/:guestId", () => {
  it("changes only the fields sent, clears blanks and bumps the version", async () => {
    const { cookie, haldi } = await setup();
    const guest = await create(cookie, {
      name: "Rajesh",
      email: "raj@example.com",
      phone: "98765",
      notes: "Uncle",
    });

    const result = await patch(cookie, guest.id, {
      version: 0,
      name: "Rajesh Sharma",
      email: "",
      notes: null,
      invitedEventIds: [haldi],
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      name: "Rajesh Sharma",
      email: null,
      phone: "98765",
      notes: null,
      invitedEvents: [{ id: haldi, name: "Haldi" }],
      version: 1,
    });
    expect((await stored(guest.id))?.emailNormalized).toBeNull();
  });

  it("keeps the token and RSVP when edited", async () => {
    const { cookie } = await setup();
    const guest = await create(cookie, { name: "Asha", maxGuests: 4 });
    const token = (await stored(guest.id))?.invitationToken;
    await recordRsvp(guest.id, 3);

    const result = await patch(cookie, guest.id, { name: "Asha Rao", maxGuests: 5 });
    expect(result.body.data).toMatchObject({ rsvpStatus: "ATTENDING", attendingCount: 3 });
    expect((await stored(guest.id))?.invitationToken).toBe(token);
  });

  it("refuses a party size below the people already coming", async () => {
    const { cookie } = await setup();
    const guest = await create(cookie, { name: "Asha", maxGuests: 4 });
    await recordRsvp(guest.id, 3);

    const result = await patch(cookie, guest.id, { version: 1, maxGuests: 2 });
    expect(result.status).toBe(400);
    expect(result.body.error?.details?.maxGuests).toContain("3 people");
    expect((await patch(cookie, guest.id, { version: 1, maxGuests: 3 })).status).toBe(200);
  });

  it("answers CONFLICT for a stale version, including after the guest's RSVP", async () => {
    const { cookie } = await setup();
    const guest = await create(cookie, { name: "Asha", maxGuests: 4 });
    expect((await patch(cookie, guest.id, { version: 0, notes: "Vegetarian" })).status).toBe(200);
    const stale = await patch(cookie, guest.id, { version: 0, notes: "Jain food" });
    expect(stale.status).toBe(409);
    expect(stale.body.error?.code).toBe("CONFLICT");

    await recordRsvp(guest.id, 2);
    expect((await patch(cookie, guest.id, { version: 1, name: "Asha R" })).status).toBe(409);
    expect((await stored(guest.id))?.notes).toBe("Vegetarian");
  });

  it("keeps an archived event the guest already has, but won't add one", async () => {
    const { cookie, haldi, archived } = await setup();
    const guest = await create(cookie, { name: "Asha", invitedEventIds: [haldi] });
    await GuestModel.updateOne(
      { _id: guest.id },
      { invitedEventIds: [haldi, archived] },
    ).setOptions({ tenantScoped: false });

    const kept = await patch(cookie, guest.id, { invitedEventIds: [archived] });
    expect(kept.status).toBe(200);
    expect((kept.body.data as GuestBody).invitedEvents).toEqual([
      expect.objectContaining({ id: archived, archivedAt: expect.any(String) }),
    ]);

    const other = await create(cookie, { name: "Bina" });
    const added = await patch(cookie, other.id, { invitedEventIds: [archived] });
    expect(added.status).toBe(400);
    expect(added.body.error?.details).toHaveProperty("invitedEventIds");
  });

  it.each([
    {},
    { version: 0 },
    { rsvpStatus: "ATTENDING" },
    { attendingCount: 1 },
    { reminderCount: 3 },
    { weddingId: "a".repeat(24) },
  ])("rejects an empty change or a server-owned field (%o)", async (body) => {
    const { cookie } = await setup();
    const guest = await create(cookie, { name: "Asha" });
    expect((await patch(cookie, guest.id, body)).status).toBe(400);
  });

  it("answers 404 for another wedding's guest and leaves it alone", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const theirs = await create(other.cookie, { name: "Theirs" });
    const result = await patch(cookie, theirs.id, { name: "Changed" });
    expect(result.status).toBe(404);
    expect(await stored(theirs.id)).toMatchObject({ name: "Theirs", __v: 0 });
  });
});

describe("DELETE /api/guests/:guestId", () => {
  it("deletes the guest and cancels emails not yet sent to them", async () => {
    const { cookie, wedding } = await setup();
    const guest = await create(cookie, { name: "Asha", email: "asha@example.com" });
    const job = (status: EmailJobStatus, key: string) => ({
      weddingId: wedding._id,
      type: "GUEST_INVITATION" as const,
      guestId: new Types.ObjectId(guest.id),
      recipientEmail: "asha@example.com",
      status,
      idempotencyKey: key,
    });
    await EmailJobModel.create([job("PENDING", "k1"), job("SENT", "k2")]);

    const result = await call(deleteGuest, {
      method: "DELETE",
      params: { guestId: guest.id },
      cookie,
    });
    expect(result).toEqual({ status: 200, body: { success: true } });
    expect(await stored(guest.id)).toBeNull();
    const statuses = await EmailJobModel.find({ guestId: guest.id })
      .setOptions({ tenantScoped: false })
      .sort({ idempotencyKey: 1 })
      .lean();
    expect(statuses.map((row) => row.status)).toEqual(["CANCELLED", "SENT"]);
    expect((await call(getGuest, { params: { guestId: guest.id }, cookie })).status).toBe(404);
  });

  it("answers 404 for another wedding's guest and keeps it", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const theirs = await create(other.cookie, { name: "Theirs" });
    const result = await call(deleteGuest, {
      method: "DELETE",
      params: { guestId: theirs.id },
      cookie,
    });
    expect(result.status).toBe(404);
    expect(await stored(theirs.id)).not.toBeNull();
  });
});

describe("GET /api/guests/rsvp-summary", () => {
  it("counts invitations by RSVP separately from the people coming", async () => {
    const { cookie, adminCookie } = await setup();
    const other = await setup();
    const a = await create(cookie, { name: "A", maxGuests: 4 });
    const b = await create(cookie, { name: "B", maxGuests: 2 });
    const c = await create(cookie, { name: "C" });
    await create(cookie, { name: "D" });
    await create(other.cookie, { name: "Other wedding" });
    await recordRsvp(a.id, 3);
    await recordRsvp(b.id, 2);
    await GuestModel.updateOne(
      { _id: c.id },
      { rsvpStatus: "NOT_ATTENDING", attendingCount: 0 },
    ).setOptions({ tenantScoped: false });

    const result = await call(rsvpSummary, { cookie: adminCookie });
    expect(result).toEqual({
      status: 200,
      body: {
        data: {
          totalGuests: 4,
          pendingInvitations: 1,
          attendingInvitations: 2,
          notAttendingInvitations: 1,
          totalPeopleAttending: 5,
        },
      },
    });
  });
});
