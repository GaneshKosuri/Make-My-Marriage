import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as dashboard } from "@/app/api/dashboard/route";
import {
  DELETE as archiveVendor,
  GET as getVendor,
  PATCH as updateVendor,
} from "@/app/api/vendors/[vendorId]/route";
import { GET as listVendors, POST as createVendor } from "@/app/api/vendors/route";
import { EventModel } from "@/modules/events/event.model";
import { VendorModel } from "@/modules/vendors/vendor.model";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** My Vendors end to end through the route handlers (PRD §9.16, API_DESIGN §59–64). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type VendorBody = Record<string, unknown> & {
  id: string;
  name: string;
  version: number;
  archivedAt: string | null;
  events: { id: string; name: string; startsAt: string; archivedAt: string | null }[];
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
    new NextRequest(`${TEST_APP_URL}/api/vendors${query}`, {
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
  const [weddingDay, mehendi, roka] = await EventModel.create([
    { weddingId: wedding._id, name: "Wedding", startsAt: new Date(`${YEAR}-02-14T14:30:00Z`) },
    { weddingId: wedding._id, name: "Mehendi", startsAt: new Date(`${YEAR}-02-12T10:30:00Z`) },
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
    weddingEvent: weddingDay!._id.toString(),
    mehendi: mehendi!._id.toString(),
    archived: roka!._id.toString(),
  };
}

async function create(cookie: string, body: Record<string, unknown>) {
  const result = await call(createVendor, { method: "POST", body, cookie });
  expect(result.status).toBe(201);
  return result.body.data as VendorBody;
}

const patch = (cookie: string, vendorId: string, body: unknown) =>
  call(updateVendor, { method: "PATCH", params: { vendorId }, body, cookie });

const names = (body: ApiBody) => (body.data as VendorBody[]).map((vendor) => vendor.name);

describe("POST /api/vendors", () => {
  it("creates a manual vendor with its events in date order", async () => {
    const { cookie, weddingEvent, mehendi } = await setup();
    const vendor = await create(cookie, {
      name: "  Pixel Photography ",
      category: "PHOTOGRAPHER",
      contactPerson: "Rohit",
      phone: "+91 98765 43210",
      email: "rohit@pixel.example",
      address: "Rajpur Road\nDehradun",
      website: "pixelphotography.in",
      totalAgreedCostPaise: 20_000_000,
      eventIds: [weddingEvent, mehendi, weddingEvent],
      notes: "Drone included",
    });

    expect(vendor).toEqual({
      id: expect.any(String),
      name: "Pixel Photography",
      category: "PHOTOGRAPHER",
      contactPerson: "Rohit",
      phone: "+91 98765 43210",
      email: "rohit@pixel.example",
      address: "Rajpur Road\nDehradun",
      website: "https://pixelphotography.in/",
      totalAgreedCostPaise: 20_000_000,
      // Ticked Wedding first; listed by date.
      events: [
        { id: mehendi, name: "Mehendi", startsAt: expect.any(String), archivedAt: null },
        { id: weddingEvent, name: "Wedding", startsAt: expect.any(String), archivedAt: null },
      ],
      notes: "Drone included",
      source: "MANUAL",
      googlePlaceId: null,
      archivedAt: null,
      version: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("needs only a name and category; blank details are stored as not set", async () => {
    const { cookie } = await setup();
    expect(
      await create(cookie, {
        name: "Pandit Ramesh Sharma",
        category: "PANDIT",
        email: "",
        phone: " ",
      }),
    ).toMatchObject({
      contactPerson: null,
      phone: null,
      email: null,
      website: null,
      totalAgreedCostPaise: null,
      events: [],
    });
  });

  it.each([
    [{ category: "DJ" }, "name"],
    [{ name: "Beat Box", category: "BAND" }, "category"],
    [{ name: "Beat Box", category: "DJ", website: "javascript:alert(1)" }, "website"],
    [{ name: "Beat Box", category: "DJ", website: "localhost" }, "website"],
    [{ name: "Beat Box", category: "DJ", totalAgreedCostPaise: 12.5 }, "totalAgreedCostPaise"],
    [{ name: "Beat Box", category: "DJ", totalAgreedCostPaise: -1 }, "totalAgreedCostPaise"],
    [{ name: "Beat Box", category: "DJ", phone: "call me" }, "phone"],
    [{ name: "Beat Box", category: "DJ", email: "not-an-email" }, "email"],
  ])("refuses an invalid vendor (%o)", async (body, field) => {
    const { cookie } = await setup();
    const result = await call(createVendor, { method: "POST", body, cookie });
    expect(result.status).toBe(400);
    expect(result.body.error?.details).toHaveProperty(field);
  });

  it("refuses fields only the server sets, including weddingId", async () => {
    const { cookie, wedding } = await setup();
    for (const extra of [
      { source: "GOOGLE_PLACES" },
      { googlePlaceId: "abc" },
      { archivedAt: new Date().toISOString() },
      { weddingId: wedding._id.toString() },
    ]) {
      const result = await call(createVendor, {
        method: "POST",
        body: { name: "Beat Box", category: "DJ", ...extra },
        cookie,
      });
      expect(result.status).toBe(400);
    }
  });

  it("links only active events of this wedding", async () => {
    const { cookie, archived } = await setup();
    const other = await setup();
    for (const eventId of [archived, other.weddingEvent]) {
      const result = await call(createVendor, {
        method: "POST",
        body: { name: "Beat Box", category: "DJ", eventIds: [eventId] },
        cookie,
      });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toHaveProperty("eventIds");
    }
  });
});

describe("GET /api/vendors", () => {
  it("lists active vendors by name, filters by category and searches name or contact", async () => {
    const { cookie } = await setup();
    await create(cookie, { name: "royal Garden Venue", category: "VENUE", contactPerson: "Meena" });
    await create(cookie, { name: "Beat Box DJs", category: "DJ", contactPerson: "Sunny (Sharma)" });
    await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });

    const all = await call(listVendors, { cookie });
    expect(names(all.body)).toEqual(["Beat Box DJs", "Pixel Photography", "royal Garden Venue"]);
    expect(all.body.pagination).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });

    expect(names((await call(listVendors, { query: "?category=DJ", cookie })).body)).toEqual([
      "Beat Box DJs",
    ]);
    expect(names((await call(listVendors, { query: "?search=MEENA", cookie })).body)).toEqual([
      "royal Garden Venue",
    ]);
    // Literal search: brackets are not a pattern.
    expect(names((await call(listVendors, { query: "?search=(Sharma)", cookie })).body)).toEqual([
      "Beat Box DJs",
    ]);
  });

  it("shows archived vendors only on request, after the active ones", async () => {
    const { cookie } = await setup();
    const archived = await create(cookie, { name: "Aarav Florists", category: "FLORIST" });
    await create(cookie, { name: "Zeal Decor", category: "DECORATOR" });
    await call(archiveVendor, { method: "DELETE", params: { vendorId: archived.id }, cookie });

    expect(names((await call(listVendors, { cookie })).body)).toEqual(["Zeal Decor"]);
    const withArchived = await call(listVendors, { query: "?includeArchived=true", cookie });
    expect(names(withArchived.body)).toEqual(["Zeal Decor", "Aarav Florists"]);
  });

  it("never lists another wedding's vendors", async () => {
    const mine = await setup();
    const theirs = await setup();
    await create(theirs.cookie, { name: "Their Caterer", category: "CATERER" });
    expect((await call(listVendors, { cookie: mine.cookie })).body.data).toEqual([]);
  });

  it.each(["?includeArchived=yes", "?category=BAND", "?weddingId=abc", "?limit=500"])(
    "refuses an invalid query (%s)",
    async (query) => {
      const { cookie } = await setup();
      expect((await call(listVendors, { query, cookie })).status).toBe(400);
    },
  );
});

describe("GET /api/vendors/:id", () => {
  it("returns this wedding's vendor and 404 for another wedding's", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });

    expect((await call(getVendor, { params: { vendorId: vendor.id }, cookie })).body.data).toEqual(
      vendor,
    );
    const elsewhere = await call(getVendor, {
      params: { vendorId: vendor.id },
      cookie: other.cookie,
    });
    expect(elsewhere).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
  });
});

describe("PATCH /api/vendors/:id", () => {
  it("changes only what is sent, clears blanks and bumps the version", async () => {
    const { cookie, mehendi } = await setup();
    const vendor = await create(cookie, {
      name: "Pixel Photography",
      category: "PHOTOGRAPHER",
      phone: "+91 98765 43210",
      totalAgreedCostPaise: 20_000_000,
    });

    const result = await patch(cookie, vendor.id, {
      phone: "",
      totalAgreedCostPaise: null,
      eventIds: [mehendi],
      version: 0,
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      name: "Pixel Photography",
      phone: null,
      totalAgreedCostPaise: null,
      events: [{ id: mehendi }],
      version: 1,
    });
  });

  it("refuses a stale version (someone saved first)", async () => {
    const { cookie } = await setup();
    const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });
    expect((await patch(cookie, vendor.id, { notes: "First", version: 0 })).status).toBe(200);

    const stale = await patch(cookie, vendor.id, { notes: "Second", version: 0 });
    expect(stale).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });
    const saved = await VendorModel.findById(vendor.id).setOptions({ tenantScoped: false }).lean();
    expect(saved?.notes).toBe("First");
  });

  it("keeps an archived event the vendor already has, but won't add one", async () => {
    const { cookie, mehendi, archived } = await setup();
    const vendor = await create(cookie, {
      name: "Pixel Photography",
      category: "PHOTOGRAPHER",
      eventIds: [mehendi],
    });
    await VendorModel.updateOne({ _id: vendor.id }, { eventIds: [mehendi, archived] }).setOptions({
      tenantScoped: false,
    });

    const kept = await patch(cookie, vendor.id, { eventIds: [archived] });
    expect(kept.status).toBe(200);
    expect((kept.body.data as VendorBody).events).toEqual([
      expect.objectContaining({ id: archived, archivedAt: expect.any(String) }),
    ]);

    const other = await create(cookie, { name: "Beat Box", category: "DJ" });
    const added = await patch(cookie, other.id, { eventIds: [archived] });
    expect(added.status).toBe(400);
    expect(added.body.error?.details).toHaveProperty("eventIds");
  });

  it("won't change an archived vendor, and answers 404 for another wedding's", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });

    expect((await patch(other.cookie, vendor.id, { notes: "Mine now" })).status).toBe(404);

    await call(archiveVendor, { method: "DELETE", params: { vendorId: vendor.id }, cookie });
    const refused = await patch(cookie, vendor.id, { notes: "Too late" });
    expect(refused).toMatchObject({
      status: 409,
      body: {
        error: { code: "CONFLICT", message: "This vendor is archived, so it can't be changed." },
      },
    });
  });

  it.each([{}, { version: 0 }, { source: "GOOGLE_PLACES" }, { name: "" }])(
    "refuses an invalid change (%o)",
    async (body) => {
      const { cookie } = await setup();
      const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });
      expect((await patch(cookie, vendor.id, body)).status).toBe(400);
    },
  );
});

describe("DELETE /api/vendors/:id", () => {
  it("archives instead of deleting, again without error, and 404 for another wedding's", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });

    const elsewhere = await call(archiveVendor, {
      method: "DELETE",
      params: { vendorId: vendor.id },
      cookie: other.cookie,
    });
    expect(elsewhere.status).toBe(404);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await call(archiveVendor, {
        method: "DELETE",
        params: { vendorId: vendor.id },
        cookie,
      });
      expect(result).toEqual({ status: 200, body: { success: true } });
    }
    const stored = await VendorModel.findById(vendor.id).setOptions({ tenantScoped: false }).lean();
    expect(stored?.archivedAt).toBeInstanceOf(Date);
    // Still readable, e.g. from an expense that links it.
    expect(
      (await call(getVendor, { params: { vendorId: vendor.id }, cookie })).body.data,
    ).toMatchObject({ archivedAt: expect.any(String) });
  });

  it("drops the vendor from the dashboard count", async () => {
    const { cookie } = await setup();
    const vendor = await create(cookie, { name: "Pixel Photography", category: "PHOTOGRAPHER" });
    await create(cookie, { name: "Beat Box", category: "DJ" });
    await call(archiveVendor, { method: "DELETE", params: { vendorId: vendor.id }, cookie });

    const summary = await dashboard(
      new NextRequest(`${TEST_APP_URL}/api/dashboard`, { headers: { cookie } }),
    );
    expect(await summary.json()).toMatchObject({ data: { summary: { vendors: 1 } } });
  });
});
