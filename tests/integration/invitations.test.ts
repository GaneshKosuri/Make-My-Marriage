import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as invitationLink } from "@/app/api/guests/[guestId]/invitation-link/route";
import { PATCH as updateGuest } from "@/app/api/guests/[guestId]/route";
import { POST as createGuest } from "@/app/api/guests/route";
import { POST as submitRsvp } from "@/app/api/public/invitations/[token]/rsvp/route";
import { GET as publicInvitation } from "@/app/api/public/invitations/[token]/route";
import { EventModel } from "@/modules/events/event.model";
import { GuestModel } from "@/modules/guests/guest.model";
import { guestRepository } from "@/modules/guests/guest.repository";
import { WeddingModel } from "@/modules/weddings/wedding.model";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/**
 * Guest invitation links, the public invitation and RSVP through the route
 * handlers (PRD §9.9–9.11, API_DESIGN §45, §50–51).
 */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  error?: { code: string; message: string; details?: Record<string, string> };
}

const YEAR = new Date().getUTCFullYear() + 1;

async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    body,
    cookie,
    origin = TEST_APP_URL,
  }: {
    method?: string;
    params?: Record<string, string>;
    body?: unknown;
    cookie?: string;
    origin?: string | null;
  } = {},
) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/test`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json()) as ApiBody,
  };
}

/** A wedding with a Manager, two active events, an archived one, and a guest invited to all three. */
async function setup(guest: Record<string, unknown> = {}) {
  const owner = await createUser();
  const wedding = await createWedding(owner._id);
  await WeddingModel.updateOne(
    { _id: wedding._id },
    { title: "Akshay & Princi", "location.city": "Jaipur", "location.state": "Rajasthan" },
  );
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  const [reception, haldi, roka] = await EventModel.create([
    {
      weddingId: wedding._id,
      name: "Reception",
      startsAt: new Date(`${YEAR}-02-15T14:30:00Z`),
      venueName: "XYZ Resort",
      address: "Dehradun",
      dressCode: "Indo-western",
    },
    { weddingId: wedding._id, name: "Haldi", startsAt: new Date(`${YEAR}-02-13T03:30:00Z`) },
    {
      weddingId: wedding._id,
      name: "Roka",
      startsAt: new Date(`${YEAR}-01-01T12:00:00Z`),
      archivedAt: new Date(),
    },
  ]);
  const created = await call(createGuest, {
    method: "POST",
    cookie: manager.cookie,
    body: {
      name: "Rajesh Sharma",
      email: "rajesh@example.com",
      phone: "+91 98765 43210",
      notes: "Uncle on Dad's side",
      maxGuests: 4,
      invitedEventIds: [reception!._id.toString(), haldi!._id.toString()],
      ...guest,
    },
  });
  expect(created.status).toBe(201);
  const guestId = (created.body.data as { id: string }).id;
  // Invited to the Roka before it was archived.
  await GuestModel.updateOne(
    { _id: guestId },
    { $push: { invitedEventIds: roka!._id } },
  ).setOptions({ tenantScoped: false });
  const token = await tokenOf(guestId);
  return { wedding, cookie: manager.cookie, guestId, token };
}

async function tokenOf(guestId: string) {
  const row = await GuestModel.findById(guestId)
    .select("+invitationToken")
    .setOptions({ tenantScoped: false })
    .lean()
    .orFail();
  return row.invitationToken;
}

const stored = (guestId: string) =>
  GuestModel.findById(guestId).setOptions({ tenantScoped: false }).lean().orFail();

const rsvp = (token: string, body: unknown, origin?: string | null) =>
  call(submitRsvp, { method: "POST", params: { token }, body, origin });

const view = (token: string) => call(publicInvitation, { params: { token } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/guests/:id/invitation-link", () => {
  it("returns the same link on the app's own origin every time", async () => {
    const { cookie, guestId, token } = await setup();
    const first = await call(invitationLink, { params: { guestId }, cookie });
    expect(first).toMatchObject({
      status: 200,
      body: { data: { url: `${TEST_APP_URL}/invite/${token}` } },
    });
    const again = await call(invitationLink, { params: { guestId }, cookie });
    expect(again.body).toEqual(first.body);
    // Sharing a link is not sending the invitation.
    expect((await stored(guestId)).invitationSentAt).toBeNull();
  });

  it("answers 404 for another wedding's guest", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const result = await call(invitationLink, { params: { guestId: other.guestId }, cookie });
    expect(result.status).toBe(404);
    expect(JSON.stringify(result.body)).not.toContain(other.token);
  });
});

describe("GET /api/public/invitations/:token", () => {
  it("shows the guest's reply, the couple and only their active events, in order", async () => {
    const { token } = await setup();
    const result = await view(token);
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      guest: { name: "Rajesh Sharma", maxGuests: 4, rsvpStatus: "PENDING", attendingCount: null },
      wedding: {
        brideName: "Princi",
        groomName: "Akshay",
        weddingDate: "2027-02-14",
        timeZone: "Asia/Kolkata",
        title: "Akshay & Princi",
        location: "Jaipur, Rajasthan",
      },
      events: [
        {
          name: "Haldi",
          startsAt: `${YEAR}-02-13T03:30:00.000Z`,
          endsAt: null,
          venueName: null,
          address: null,
          dressCode: null,
          description: null,
        },
        {
          name: "Reception",
          startsAt: `${YEAR}-02-15T14:30:00.000Z`,
          endsAt: null,
          venueName: "XYZ Resort",
          address: "Dehradun",
          dressCode: "Indo-western",
          description: null,
        },
      ],
    });
    expect(result.headers.get("cache-control")).toContain("no-store");
  });

  it("never exposes ids, contacts, notes or the token", async () => {
    const { token, guestId, wedding } = await setup();
    const text = JSON.stringify((await view(token)).body);
    for (const secret of [
      guestId,
      wedding._id.toString(),
      "rajesh@example.com",
      "98765",
      "Uncle",
      token,
      "Roka",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("answers the same 404 for malformed, unknown and deleted links, and deleted weddings", async () => {
    const deleted = await setup();
    await GuestModel.deleteOne({ _id: deleted.guestId }).setOptions({ tenantScoped: false });
    const goneWedding = await setup();
    await WeddingModel.updateOne({ _id: goneWedding.wedding._id }, { deletedAt: new Date() });

    for (const token of [
      "short",
      randomBytes(32).toString("base64url"),
      deleted.token,
      goneWedding.token,
    ]) {
      const result = await view(token);
      expect(result).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    }
  });
});

describe("POST /api/public/invitations/:token/rsvp", () => {
  it("records a reply for the whole party and lets the guest change it later", async () => {
    const { token, guestId } = await setup();

    const yes = await rsvp(token, { status: "ATTENDING", attendingCount: 3 });
    expect(yes).toMatchObject({
      status: 200,
      body: { data: { status: "ATTENDING", attendingCount: 3, updatedAt: expect.any(String) } },
    });
    expect(await stored(guestId)).toMatchObject({
      rsvpStatus: "ATTENDING",
      attendingCount: 3,
      rsvpUpdatedAt: expect.any(Date),
      __v: 1,
    });

    const no = await rsvp(token, { status: "NOT_ATTENDING", attendingCount: 0 });
    expect(no.body.data).toMatchObject({ status: "NOT_ATTENDING", attendingCount: 0 });
    expect((await view(token)).body.data).toMatchObject({
      guest: { rsvpStatus: "NOT_ATTENDING", attendingCount: 0 },
    });
  });

  it("treats the same reply twice as one change", async () => {
    const { token, guestId } = await setup();
    await rsvp(token, { status: "ATTENDING", attendingCount: 2 });
    const before = await stored(guestId);
    const again = await rsvp(token, { status: "ATTENDING", attendingCount: 2 });
    expect(again.status).toBe(200);
    expect(await stored(guestId)).toMatchObject({
      __v: before.__v,
      rsvpUpdatedAt: before.rsvpUpdatedAt,
    });
  });

  it("refuses more people than the invitation allows (GUEST_LIMIT_EXCEEDED)", async () => {
    const { token, guestId } = await setup();
    const result = await rsvp(token, { status: "ATTENDING", attendingCount: 5 });
    expect(result).toMatchObject({
      status: 400,
      body: {
        error: {
          code: "GUEST_LIMIT_EXCEEDED",
          details: { attendingCount: "This invitation is for up to 4 people." },
        },
      },
    });
    expect(await stored(guestId)).toMatchObject({ rsvpStatus: "PENDING", __v: 0 });
  });

  it.each([
    { status: "ATTENDING", attendingCount: 0 },
    { status: "NOT_ATTENDING", attendingCount: 1 },
    { status: "PENDING", attendingCount: 0 },
    { status: "ATTENDING", attendingCount: 2.5 },
    { status: "ATTENDING" },
    { status: "ATTENDING", attendingCount: 2, maxGuests: 10 },
  ])("rejects an invalid reply (%o)", async (body) => {
    const { token, guestId } = await setup();
    expect((await rsvp(token, body)).status).toBe(400);
    expect((await stored(guestId)).__v).toBe(0);
  });

  it("answers 404 for unusable links and refuses requests from other sites", async () => {
    const { token } = await setup();
    for (const bad of ["short", randomBytes(32).toString("base64url")]) {
      expect((await rsvp(bad, { status: "ATTENDING", attendingCount: 1 })).status).toBe(404);
    }
    const foreign = await rsvp(
      token,
      { status: "ATTENDING", attendingCount: 1 },
      "https://evil.example",
    );
    expect(foreign.status).toBe(403);
  });

  it("allows 20 replies per invitation in 15 minutes, then 429 with Retry-After", async () => {
    const { token } = await setup();
    for (let index = 0; index < 20; index += 1) {
      const count = (index % 4) + 1;
      expect((await rsvp(token, { status: "ATTENDING", attendingCount: count })).status).toBe(200);
    }
    const limited = await rsvp(token, { status: "ATTENDING", attendingCount: 1 });
    expect(limited.status).toBe(429);
    expect(limited.body.error?.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

    // Another guest's link has its own allowance.
    const other = await setup();
    expect((await rsvp(other.token, { status: "ATTENDING", attendingCount: 1 })).status).toBe(200);
  });

  it("does not spend the invitation's allowance on replies it rejects", async () => {
    const { token } = await setup();
    for (let index = 0; index < 25; index += 1) {
      await rsvp(token, { status: "ATTENDING", attendingCount: 9 });
    }
    expect((await rsvp(token, { status: "ATTENDING", attendingCount: 2 })).status).toBe(200);
  });

  it("answers PARTY_SIZE_CHANGED when the organiser lowers the party size meanwhile", async () => {
    const { token, guestId, cookie } = await setup();
    const stale = await guestRepository.findByInvitationToken(token);
    // The organiser lowers the party size between the guest's read and write.
    const lowered = await call(updateGuest, {
      method: "PATCH",
      params: { guestId },
      cookie,
      body: { maxGuests: 2 },
    });
    expect(lowered.status).toBe(200);
    vi.spyOn(guestRepository, "findByInvitationToken").mockResolvedValueOnce(stale);

    const result = await rsvp(token, { status: "ATTENDING", attendingCount: 4 });
    expect(result).toMatchObject({ status: 400, body: { error: { code: "PARTY_SIZE_CHANGED" } } });
    expect(await stored(guestId)).toMatchObject({ rsvpStatus: "PENDING", maxGuests: 2 });
  });

  it("answers CONFLICT when the guest changed meanwhile for another reason", async () => {
    const { token, guestId, cookie } = await setup();
    const stale = await guestRepository.findByInvitationToken(token);
    await call(updateGuest, {
      method: "PATCH",
      params: { guestId },
      cookie,
      body: { notes: "VIP" },
    });
    vi.spyOn(guestRepository, "findByInvitationToken").mockResolvedValueOnce(stale);

    const result = await rsvp(token, { status: "ATTENDING", attendingCount: 2 });
    expect(result).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });
  });
});
