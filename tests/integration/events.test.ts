import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  DELETE as archiveEvent,
  GET as getEvent,
  PATCH as updateEvent,
} from "@/app/api/events/[eventId]/route";
import { GET as listEvents, POST as createEvent } from "@/app/api/events/route";
import { eventsService } from "@/modules/events";
import { EventModel } from "@/modules/events/event.model";
import { eventRepository } from "@/modules/events/event.repository";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** Wedding events end to end through the route handlers (PRD §9.5, API_DESIGN §29–33). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type EventBody = Record<string, unknown> & { id: string; version: number };

const YEAR = new Date().getUTCFullYear() + 1;
const at = (monthDay: string, time: string) => `${YEAR}-${monthDay}T${time}:00.000Z`;

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
    new NextRequest(`${TEST_APP_URL}/api/events${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/** A wedding with a signed-in Manager (events are open to every member). */
async function weddingWithManager() {
  const owner = await createUser();
  const wedding = await createWedding(owner._id);
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, cookie: manager.cookie };
}

const mehendi = {
  name: "Mehendi",
  type: "MEHENDI",
  startsAt: at("02-12", "10:30"),
  endsAt: at("02-12", "14:30"),
  venueName: "Royal Garden",
  address: "Dehradun",
  description: "Henna and music",
  dressCode: "Green / Traditional",
};

async function create(cookie: string, body: Record<string, unknown> = mehendi) {
  const result = await call(createEvent, { method: "POST", body, cookie });
  expect(result.status).toBe(201);
  return result.body.data as EventBody;
}

const patch = (cookie: string, eventId: string, body: unknown) =>
  call(updateEvent, { method: "PATCH", params: { eventId }, body, cookie });

const archive = (cookie: string, eventId: string) =>
  call(archiveEvent, { method: "DELETE", params: { eventId }, cookie });

// Test-only read straight from the collection, across weddings.
const stored = (id: string) =>
  EventModel.findById(id).setOptions({ tenantScoped: false }).lean().orFail();

const otherWeddingEvent = async () => {
  const other = await weddingWithManager();
  return { ...other, event: await create(other.cookie) };
};

const names = (body: ApiBody) => (body.data as EventBody[]).map((event) => event.name);

describe("POST /api/events", () => {
  it("creates an event for the caller's wedding", async () => {
    const { wedding, cookie } = await weddingWithManager();
    const event = await create(cookie);

    expect(event).toEqual({
      id: expect.any(String),
      ...mehendi,
      archivedAt: null,
      version: 0,
    });
    const doc = await stored(event.id);
    expect(doc.weddingId.toString()).toBe(wedding._id.toString());
    expect(doc.startsAt.toISOString()).toBe(mehendi.startsAt);
  });

  it("needs only a name and start; blank text is stored as not set", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie, {
      name: "  Family dinner ",
      startsAt: `${YEAR}-02-10T19:00:00+05:30`,
      venueName: "  ",
      dressCode: "",
    });

    expect(event).toMatchObject({
      name: "Family dinner",
      type: null,
      startsAt: `${YEAR}-02-10T13:30:00.000Z`,
      endsAt: null,
      venueName: null,
      address: null,
      dressCode: null,
    });
  });

  it.each([
    [{ ...mehendi, name: " " }, "name"],
    [{ ...mehendi, startsAt: `${YEAR}-02-12T10:30:00` }, "startsAt"],
    [{ ...mehendi, startsAt: `${YEAR}-02-12` }, "startsAt"],
    [{ ...mehendi, endsAt: mehendi.startsAt }, "endsAt"],
    [{ ...mehendi, endsAt: at("02-12", "09:00") }, "endsAt"],
    [{ ...mehendi, type: "BARAAT" }, "type"],
    [{ ...mehendi, venueName: "x".repeat(201) }, "venueName"],
  ])("rejects invalid input (%#: %s)", async (body, field) => {
    const { cookie } = await weddingWithManager();
    const result = await call(createEvent, { method: "POST", body, cookie });
    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("VALIDATION_ERROR");
    expect(result.body.error?.details).toHaveProperty(field);
  });

  it("rejects a client-supplied weddingId (strict schema)", async () => {
    const { cookie } = await weddingWithManager();
    const other = await weddingWithManager();
    const result = await call(createEvent, {
      method: "POST",
      body: { ...mehendi, weddingId: other.wedding._id.toString() },
      cookie,
    });
    expect(result.status).toBe(400);
    expect(await EventModel.countDocuments({ weddingId: other.wedding._id })).toBe(0);
  });
});

describe("GET /api/events", () => {
  it("lists the wedding's events by start time, without archived ones by default", async () => {
    const { cookie } = await weddingWithManager();
    await create(cookie, { name: "Wedding", startsAt: at("02-14", "18:00") });
    await create(cookie, { name: "Haldi", startsAt: at("02-13", "08:00") });
    const roka = await create(cookie, { name: "Roka", startsAt: at("01-05", "12:00") });
    await create(cookie, mehendi);
    await archive(cookie, roka.id);
    await otherWeddingEvent();

    const active = await call(listEvents, { cookie });
    expect(active.status).toBe(200);
    expect(names(active.body)).toEqual(["Mehendi", "Haldi", "Wedding"]);

    const all = await call(listEvents, { cookie, query: "?includeArchived=true" });
    expect(names(all.body)).toEqual(["Roka", "Mehendi", "Haldi", "Wedding"]);
    expect((all.body.data as EventBody[])[0]?.archivedAt).toEqual(expect.any(String));
  });

  it("filters to events that start in [from, to)", async () => {
    const { cookie } = await weddingWithManager();
    await create(cookie, { name: "Mehendi", startsAt: at("02-12", "10:00") });
    await create(cookie, { name: "Haldi", startsAt: at("02-13", "08:00") });
    await create(cookie, { name: "Wedding", startsAt: at("02-14", "18:00") });

    const result = await call(listEvents, {
      cookie,
      query: `?from=${encodeURIComponent(at("02-12", "10:00"))}&to=${encodeURIComponent(at("02-14", "18:00"))}`,
    });
    expect(names(result.body)).toEqual(["Mehendi", "Haldi"]);
  });

  it.each([
    "?includeArchived=yes",
    "?from=tomorrow",
    "?weddingId=abc",
    `?from=${at("02-14", "10:00")}&to=${at("02-13", "10:00")}`,
  ])("rejects an invalid query (%s)", async (query) => {
    const { cookie } = await weddingWithManager();
    const result = await call(listEvents, { cookie, query });
    expect(result.status).toBe(400);
    expect(result.body.error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/events/:eventId", () => {
  it("returns the event, archived ones included", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);
    await archive(cookie, event.id);

    const result = await call(getEvent, { params: { eventId: event.id }, cookie });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      id: event.id,
      name: "Mehendi",
      archivedAt: expect.any(String),
    });
  });

  it("answers 400 for a malformed id and 404 for an unknown one", async () => {
    const { cookie } = await weddingWithManager();
    expect((await call(getEvent, { params: { eventId: "nope" }, cookie })).status).toBe(400);
    const unknown = randomBytes(12).toString("hex");
    expect(await call(getEvent, { params: { eventId: unknown }, cookie })).toMatchObject({
      status: 404,
      body: { error: { code: "NOT_FOUND" } },
    });
  });
});

describe("PATCH /api/events/:eventId", () => {
  it("changes only the fields sent and bumps the version", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);

    const result = await patch(cookie, event.id, {
      venueName: "Lake Palace",
      dressCode: "",
      endsAt: null,
      version: 0,
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      ...event,
      venueName: "Lake Palace",
      dressCode: null,
      endsAt: null,
      version: 1,
    });
    expect((await stored(event.id)).__v).toBe(1);
  });

  it("checks the start/end pair after merging with the stored event", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);

    const late = await patch(cookie, event.id, { startsAt: at("02-12", "15:00") });
    expect(late.status).toBe(400);
    expect(late.body.error?.details).toEqual({ endsAt: "End the event after it starts" });

    const moved = await patch(cookie, event.id, {
      startsAt: at("02-12", "15:00"),
      endsAt: at("02-12", "19:00"),
    });
    expect(moved.status).toBe(200);
    expect(moved.body.data).toMatchObject({ version: 1 });
  });

  it("refuses a stale version with CONFLICT and keeps the newer change", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);
    expect((await patch(cookie, event.id, { name: "Mehendi night", version: 0 })).status).toBe(200);

    const stale = await patch(cookie, event.id, { name: "Henna", version: 0 });
    expect(stale).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });
    expect((await stored(event.id)).name).toBe("Mehendi night");
  });

  it("refuses a write when the event changed between the read and the update", async () => {
    const { wedding, cookie } = await weddingWithManager();
    const event = await create(cookie);
    await patch(cookie, event.id, { name: "Mehendi night" });

    const updated = await eventRepository.updateVersioned(wedding._id.toString(), event.id, 0, {
      name: "Henna",
    });
    expect(updated).toBeNull();
    expect((await stored(event.id)).name).toBe("Mehendi night");
  });

  it("keeps archived events read-only", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);
    await archive(cookie, event.id);

    const result = await patch(cookie, event.id, { name: "Henna" });
    expect(result).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });
    expect(result.body.error?.message).toMatch(/archived/);
  });

  it.each([{}, { version: 0 }, { name: "Henna", weddingId: randomBytes(12).toString("hex") }])(
    "rejects a body with nothing to change or unknown fields (%#)",
    async (body) => {
      const { cookie } = await weddingWithManager();
      const event = await create(cookie);
      const result = await patch(cookie, event.id, body);
      expect(result.status).toBe(400);
      expect((await stored(event.id)).name).toBe("Mehendi");
    },
  );
});

describe("DELETE /api/events/:eventId", () => {
  it("archives instead of deleting, and a second archive still succeeds", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);

    expect(await archive(cookie, event.id)).toEqual({ status: 200, body: { success: true } });
    const doc = await stored(event.id);
    expect(doc.archivedAt).toBeInstanceOf(Date);
    expect(doc.__v).toBe(1);

    expect(await archive(cookie, event.id)).toEqual({ status: 200, body: { success: true } });
  });

  it("refuses an edit made from the copy read before it was archived", async () => {
    const { cookie } = await weddingWithManager();
    const event = await create(cookie);
    await archive(cookie, event.id);
    expect((await patch(cookie, event.id, { name: "Henna", version: 0 })).status).toBe(409);
  });
});

describe("another wedding's events", () => {
  it("are NOT_FOUND for get, update and archive, and stay unchanged", async () => {
    const { cookie } = await weddingWithManager();
    const { event } = await otherWeddingEvent();
    const params = { eventId: event.id };

    for (const result of [
      await call(getEvent, { params, cookie }),
      await patch(cookie, event.id, { name: "Hijacked", version: 0 }),
      await archive(cookie, event.id),
    ]) {
      expect(result).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    }
    const doc = await stored(event.id);
    expect(doc).toMatchObject({ name: "Mehendi", archivedAt: null, __v: 0 });
  });
});

describe("eventsService.assertActiveEventsInWedding (DATABASE_DESIGN §83)", () => {
  async function eventIn(weddingId: Types.ObjectId, archivedAt: Date | null = null) {
    const doc = await EventModel.create({
      weddingId,
      name: "Sangeet",
      startsAt: new Date(at("02-11", "19:00")),
      archivedAt,
    });
    return doc._id.toString();
  }

  it("accepts active events of the wedding (duplicates allowed)", async () => {
    const { wedding } = await weddingWithManager();
    const id = await eventIn(wedding._id);
    await expect(
      eventsService.assertActiveEventsInWedding(wedding._id.toString(), [id, id]),
    ).resolves.toBeUndefined();
  });

  it("rejects archived events and events of another wedding", async () => {
    const { wedding } = await weddingWithManager();
    const other = await weddingWithManager();
    const weddingId = wedding._id.toString();
    const active = await eventIn(wedding._id);

    for (const id of [await eventIn(wedding._id, new Date()), await eventIn(other.wedding._id)]) {
      await expect(
        eventsService.assertActiveEventsInWedding(weddingId, [active, id]),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});
