import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET as getPlace } from "@/app/api/vendor-discovery/places/[placeId]/route";
import { GET as searchPlaces } from "@/app/api/vendor-discovery/search/route";
import { POST as addFromPlace } from "@/app/api/vendors/from-place/route";
import { POST as createVendor } from "@/app/api/vendors/route";
import { DELETE as archiveVendor } from "@/app/api/vendors/[vendorId]/route";
import { EventModel } from "@/modules/events/event.model";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import { AppError } from "@/server/errors";
import {
  createFakeVendorDiscoveryAdapter,
  setVendorDiscoveryServiceForTests,
  type PlaceSearchInput,
  type VendorDiscoveryService,
} from "@/server/places";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** Vendor discovery end to end with the fake provider (PRD §9.17, API_DESIGN §61, §65–66). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type Found = {
  googlePlaceId: string;
  name: string;
  myVendor: { id: string; archived: boolean } | null;
} & Record<string, unknown>;

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
    new NextRequest(`${TEST_APP_URL}/api/vendor-discovery${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/** The fake provider, recording what was searched for. */
function recordingProvider() {
  const fake = createFakeVendorDiscoveryAdapter();
  const searches: PlaceSearchInput[] = [];
  const provider: VendorDiscoveryService = {
    ...fake,
    search: (input) => {
      searches.push(input);
      return fake.search(input);
    },
  };
  setVendorDiscoveryServiceForTests(provider);
  return searches;
}

afterEach(() => setVendorDiscoveryServiceForTests(undefined));

async function setup({ city = "Dehradun", state = "Uttarakhand" } = {}) {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  await WeddingModel.updateOne(
    { _id: wedding._id },
    { $set: { "location.city": city || null, "location.state": state || null } },
  ).setOptions({ tenantScoped: false });
  const member = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, cookie: member.cookie };
}

const search = (cookie: string, query: string) =>
  call(searchPlaces, { query: `/search${query}`, cookie });

const fromPlace = (cookie: string, body: Record<string, unknown>) =>
  call(addFromPlace, { method: "POST", body, cookie });

describe("GET /api/vendor-discovery/search", () => {
  it("searches the category's keyword near the wedding's city by default", async () => {
    const searches = recordingProvider();
    const { cookie } = await setup();

    const result = await search(cookie, "?category=PHOTOGRAPHER");

    expect(result.status).toBe(200);
    expect(searches).toEqual([
      {
        keyword: "wedding photographer",
        near: "Dehradun, Uttarakhand",
        query: undefined,
        maxResults: 20,
      },
    ]);
    expect(result.body.data).toEqual([
      {
        googlePlaceId: "fake-place-1",
        name: "Sample Wedding Photography",
        rating: 4.7,
        ratingCount: 120,
        address: "Rajpur Road, Dehradun, Uttarakhand",
        myVendor: null,
      },
      expect.objectContaining({ googlePlaceId: "fake-place-2", myVendor: null }),
    ]);
  });

  it("uses the place and keywords the family typed", async () => {
    const searches = recordingProvider();
    const { cookie } = await setup();

    await search(cookie, "?category=CATERER&near=%20Rishikesh%20&query=pure%20veg");

    expect(searches[0]).toMatchObject({
      keyword: "wedding caterer",
      near: "Rishikesh",
      query: "pure veg",
    });
  });

  it("asks for a place when the wedding has no city or state", async () => {
    const searches = recordingProvider();
    const { cookie } = await setup({ city: "", state: "" });

    const result = await search(cookie, "?category=VENUE&near=%20");

    expect(result.status).toBe(400);
    expect(result.body.error?.details).toEqual({ near: "Enter a town or city to search near" });
    expect(searches).toEqual([]);
  });

  it("refuses an unknown category, coordinates and a weddingId", async () => {
    const { cookie, wedding } = await setup();
    for (const query of [
      "?category=ASTROLOGER",
      "",
      "?category=VENUE&latitude=28.6",
      `?category=VENUE&weddingId=${wedding._id.toString()}`,
    ]) {
      expect((await search(cookie, query)).status).toBe(400);
    }
  });

  it("marks places already in My Vendors, archived ones too, for this wedding only", async () => {
    const { cookie, wedding } = await setup();
    const other = await setup();
    const [active, archived] = await VendorModel.create([
      {
        weddingId: wedding._id,
        name: "Pixel",
        category: "PHOTOGRAPHER",
        source: "GOOGLE_PLACES",
        googlePlaceId: "fake-place-1",
      },
      {
        weddingId: wedding._id,
        name: "Banquet",
        category: "VENUE",
        source: "GOOGLE_PLACES",
        googlePlaceId: "fake-place-2",
        archivedAt: new Date(),
      },
    ]);

    const mine = (await search(cookie, "?category=PHOTOGRAPHER")).body.data as Found[];
    expect(mine.map((place) => place.myVendor)).toEqual([
      { id: active!._id.toString(), archived: false },
      { id: archived!._id.toString(), archived: true },
    ]);
    const theirs = (await search(other.cookie, "?category=PHOTOGRAPHER")).body.data as Found[];
    expect(theirs.map((place) => place.myVendor)).toEqual([null, null]);
  });

  it("answers EXTERNAL_SERVICE_ERROR without provider detail when Google fails", async () => {
    setVendorDiscoveryServiceForTests({
      ...createFakeVendorDiscoveryAdapter(),
      search: async () => {
        throw new AppError(
          "EXTERNAL_SERVICE_ERROR",
          "Vendor discovery is temporarily unavailable.",
        );
      },
    });
    const { cookie } = await setup();

    const result = await search(cookie, "?category=DJ");

    expect(result.status).toBeGreaterThanOrEqual(500);
    expect(result.body.error).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      message: "Vendor discovery is temporarily unavailable.",
    });
  });

  it("allows 30 searches per wedding per hour", async () => {
    recordingProvider();
    const { cookie } = await setup();
    for (let i = 0; i < 30; i += 1) {
      expect((await search(cookie, "?category=DJ")).status).toBe(200);
    }
    const limited = await search(cookie, "?category=DJ");
    expect(limited.status).toBe(429);
    expect(limited.body.error?.code).toBe("RATE_LIMITED");
  });

  it("needs a signed-in member", async () => {
    expect((await search("", "?category=DJ")).status).toBe(401);
  });
});

describe("GET /api/vendor-discovery/places/:placeId", () => {
  it("returns the details that pre-fill the add form", async () => {
    const { cookie } = await setup();

    const result = await call(getPlace, { params: { placeId: "fake-place-1" }, cookie });

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      googlePlaceId: "fake-place-1",
      name: "Sample Wedding Photography",
      rating: 4.7,
      ratingCount: 120,
      address: "Rajpur Road, Dehradun, Uttarakhand",
      phone: "+91 90000 00001",
      website: "https://example.com/photography",
      myVendor: null,
    });
  });

  it("drops a phone or website the form wouldn't accept", async () => {
    const fake = createFakeVendorDiscoveryAdapter();
    setVendorDiscoveryServiceForTests({
      ...fake,
      getPlaceDetails: async (id) => ({
        ...(await fake.getPlaceDetails(id)),
        phone: "call 98765",
        website: "javascript:alert(1)",
      }),
    });
    const { cookie } = await setup();

    const result = await call(getPlace, { params: { placeId: "fake-place-1" }, cookie });

    expect(result.body.data).toMatchObject({ phone: null, website: null });
  });

  it("answers 404 for a place Google doesn't know and 400 for a malformed id", async () => {
    const { cookie } = await setup();
    const unknown = await call(getPlace, { params: { placeId: "fake-place-9" }, cookie });
    expect(unknown.status).toBe(404);
    const malformed = await call(getPlace, { params: { placeId: "a/b" }, cookie });
    expect(malformed.status).toBe(400);
  });
});

describe("POST /api/vendors/from-place", () => {
  const reviewed = {
    googlePlaceId: "fake-place-1",
    name: "Pixel Photography (Rajpur Road)",
    category: "PHOTOGRAPHER",
    phone: "+91 90000 00001",
    website: "example.com/photography",
    address: "Rajpur Road, Dehradun",
    totalAgreedCostPaise: 15_000_000,
  };

  it("saves the reviewed form as a Google vendor", async () => {
    const { cookie, wedding } = await setup();
    const [haldi] = await EventModel.create([
      { weddingId: wedding._id, name: "Haldi", startsAt: new Date("2027-02-13T05:00:00Z") },
    ]);

    const result = await fromPlace(cookie, { ...reviewed, eventIds: [haldi!._id.toString()] });

    expect(result.status).toBe(201);
    expect(result.body.data).toMatchObject({
      name: "Pixel Photography (Rajpur Road)",
      category: "PHOTOGRAPHER",
      website: "https://example.com/photography",
      totalAgreedCostPaise: 15_000_000,
      source: "GOOGLE_PLACES",
      googlePlaceId: "fake-place-1",
      events: [expect.objectContaining({ name: "Haldi" })],
      version: 0,
    });
    const found = (await search(cookie, "?category=PHOTOGRAPHER")).body.data as Found[];
    expect(found[0]!.myVendor).toEqual({
      id: (result.body.data as { id: string }).id,
      archived: false,
    });
  });

  it("refuses the same place twice, even when the first is archived", async () => {
    const { cookie } = await setup();
    const first = await fromPlace(cookie, reviewed);
    expect(first.status).toBe(201);

    const again = await fromPlace(cookie, { ...reviewed, name: "Pixel again" });
    expect(again.status).toBe(409);
    expect(again.body.error).toMatchObject({
      code: "CONFLICT",
      message: "This place is already in My Vendors.",
    });

    const vendorId = (first.body.data as { id: string }).id;
    await call(archiveVendor, { method: "DELETE", params: { vendorId }, cookie });
    expect((await fromPlace(cookie, reviewed)).status).toBe(409);
  });

  it("lets two weddings add the same place", async () => {
    const one = await setup();
    const two = await setup();
    expect((await fromPlace(one.cookie, reviewed)).status).toBe(201);
    expect((await fromPlace(two.cookie, reviewed)).status).toBe(201);
  });

  it("refuses a place Google no longer lists", async () => {
    const { cookie } = await setup();

    const result = await fromPlace(cookie, { ...reviewed, googlePlaceId: "fake-place-9" });

    expect(result.status).toBe(400);
    expect(result.body.error?.details).toEqual({
      googlePlaceId: "Google no longer lists this place. Add it by hand instead.",
    });
    const saved = await VendorModel.countDocuments({ googlePlaceId: "fake-place-9" }).setOptions({
      tenantScoped: false,
    });
    expect(saved).toBe(0);
  });

  it("refuses fields only the server sets and another wedding's events", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const [theirEvent] = await EventModel.create([
      {
        weddingId: other.wedding._id,
        name: "Sangeet",
        startsAt: new Date("2027-02-12T13:00:00Z"),
      },
    ]);
    for (const extra of [
      { source: "MANUAL" },
      { weddingId: other.wedding._id.toString() },
      { rating: 5 },
    ]) {
      expect((await fromPlace(cookie, { ...reviewed, ...extra })).status).toBe(400);
    }
    const withTheirEvent = await fromPlace(cookie, {
      ...reviewed,
      eventIds: [theirEvent!._id.toString()],
    });
    expect(withTheirEvent.status).toBe(400);
    expect(withTheirEvent.body.error?.details).toHaveProperty("eventIds");
  });

  it("lets a manual vendor and a Google vendor of the same business coexist", async () => {
    const { cookie } = await setup();
    const manual = await call(createVendor, {
      method: "POST",
      body: { name: "Pixel Photography", category: "PHOTOGRAPHER" },
      cookie,
    });
    expect(manual.body.data).toMatchObject({ source: "MANUAL", googlePlaceId: null });
    expect((await fromPlace(cookie, reviewed)).status).toBe(201);
  });
});
