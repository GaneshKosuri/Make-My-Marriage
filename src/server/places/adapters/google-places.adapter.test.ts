import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/server/errors";

import { buildTextQuery, createGooglePlacesAdapter } from "./google-places.adapter";

const KEY = "test-places-key";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function adapterAnswering(response: Response | Error) {
  const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return response;
  });
  const adapter = createGooglePlacesAdapter(KEY, fetchMock as unknown as typeof fetch);
  return { adapter, fetchMock };
}

const sentHeaders = (init: RequestInit | undefined) => init?.headers as Record<string, string>;

describe("buildTextQuery", () => {
  it("puts the keyword, the family's words and the place together", () => {
    expect(buildTextQuery("wedding photographer", " Dehradun ", " candid ")).toBe(
      "wedding photographer candid in Dehradun",
    );
    expect(buildTextQuery("wedding venue", "Jaipur, Rajasthan")).toBe(
      "wedding venue in Jaipur, Rajasthan",
    );
  });
});

describe("createGooglePlacesAdapter.search", () => {
  it("sends a Text Search in English for India with the key in a header and a field mask", async () => {
    const { adapter, fetchMock } = adapterAnswering(json(200, { places: [] }));

    await adapter.search({ keyword: "wedding DJ", near: "Pune", maxResults: 20 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(String(url)).not.toContain(KEY);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      textQuery: "wedding DJ in Pune",
      languageCode: "en",
      regionCode: "IN",
      pageSize: 20,
    });
    expect(sentHeaders(init)["X-Goog-Api-Key"]).toBe(KEY);
    expect(sentHeaders(init)["X-Goog-FieldMask"]).toBe(
      "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    );
  });

  it("maps places to the fields the UI shows and skips ones without an id or name", async () => {
    const { adapter } = adapterAnswering(
      json(200, {
        places: [
          {
            id: "ChIJ-1",
            displayName: { text: " Pixel Photography ", languageCode: "en" },
            formattedAddress: "Rajpur Road, Dehradun",
            rating: 4.8,
            userRatingCount: 212,
          },
          { id: "ChIJ-2", displayName: { text: "New Studio" } },
          { displayName: { text: "No id" } },
          { id: "ChIJ-4" },
        ],
      }),
    );

    await expect(adapter.search({ keyword: "x", near: "y" })).resolves.toEqual([
      {
        googlePlaceId: "ChIJ-1",
        name: "Pixel Photography",
        rating: 4.8,
        ratingCount: 212,
        address: "Rajpur Road, Dehradun",
      },
      {
        googlePlaceId: "ChIJ-2",
        name: "New Studio",
        rating: null,
        ratingCount: null,
        address: null,
      },
    ]);
  });

  it("treats an empty answer as no results", async () => {
    const { adapter } = adapterAnswering(json(200, {}));
    await expect(adapter.search({ keyword: "x", near: "y" })).resolves.toEqual([]);
  });

  it.each([
    ["a provider error", json(403, { error: { code: 403, status: "PERMISSION_DENIED" } })],
    ["a quota error", json(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED" } })],
    ["a network failure", new TypeError("fetch failed")],
  ])("turns %s into EXTERNAL_SERVICE_ERROR without provider detail", async (_label, answer) => {
    const { adapter } = adapterAnswering(answer);

    const error = await adapter.search({ keyword: "x", near: "y" }).catch((caught) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      message: "Vendor discovery is temporarily unavailable.",
    });
  });
});

describe("createGooglePlacesAdapter.getPlaceDetails", () => {
  it("asks for one place's contact details and prefers the international phone", async () => {
    const { adapter, fetchMock } = adapterAnswering(
      json(200, {
        id: "ChIJ-1",
        displayName: { text: "Pixel Photography" },
        formattedAddress: "Rajpur Road, Dehradun",
        rating: 4.8,
        userRatingCount: 212,
        internationalPhoneNumber: "+91 98765 43210",
        nationalPhoneNumber: "098765 43210",
        websiteUri: "https://pixel.example/",
      }),
    );

    await expect(adapter.getPlaceDetails("ChIJ-1")).resolves.toEqual({
      googlePlaceId: "ChIJ-1",
      name: "Pixel Photography",
      rating: 4.8,
      ratingCount: 212,
      address: "Rajpur Road, Dehradun",
      phone: "+91 98765 43210",
      website: "https://pixel.example/",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://places.googleapis.com/v1/places/ChIJ-1?languageCode=en&regionCode=IN",
    );
    expect(init?.method).toBe("GET");
    expect(sentHeaders(init)["X-Goog-FieldMask"]).toContain("websiteUri");
  });

  it("falls back to the national phone and leaves missing details empty", async () => {
    const { adapter } = adapterAnswering(
      json(200, {
        id: "ChIJ-1",
        displayName: { text: "Pixel" },
        nationalPhoneNumber: "0135 2712345",
      }),
    );
    await expect(adapter.getPlaceDetails("ChIJ-1")).resolves.toMatchObject({
      phone: "0135 2712345",
      website: null,
      address: null,
    });
  });

  it.each([
    ["404", json(404, { error: { code: 404, status: "NOT_FOUND" } })],
    ["an invalid id", json(400, { error: { code: 400, status: "INVALID_ARGUMENT" } })],
  ])("answers NOT_FOUND for %s", async (_label, answer) => {
    const { adapter } = adapterAnswering(answer);
    await expect(adapter.getPlaceDetails("ChIJ-x")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers EXTERNAL_SERVICE_ERROR when Google is down", async () => {
    const { adapter } = adapterAnswering(json(503, { error: { status: "UNAVAILABLE" } }));
    await expect(adapter.getPlaceDetails("ChIJ-1")).rejects.toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
    });
  });
});
