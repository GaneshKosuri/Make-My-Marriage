// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";
import type {
  DiscoveredPlaceDetailsDto,
  DiscoveredVendorDto,
  VendorDto,
} from "@/modules/vendors/vendor.types";

import { DISCOVER } from "../vendors-content";
import { DiscoverScreen } from "./discover-screen";
import { AppToaster } from "@/components/ui/toaster";

let search = "";
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push }),
  usePathname: () => "/app/vendors/discover",
  useSearchParams: () => new URLSearchParams(search),
}));

const mehendi: EventDto = {
  id: "6aeb2fe70d805e865a620a01",
  name: "Mehendi",
  type: null,
  startsAt: "2027-02-12T10:30:00.000Z",
  endsAt: null,
  venueName: null,
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 0,
};

const pixel: DiscoveredVendorDto = {
  googlePlaceId: "ChIJ-pixel",
  name: "Pixel Photography",
  rating: 4.8,
  ratingCount: 1212,
  address: "Rajpur Road, Dehradun, Uttarakhand",
  myVendor: null,
};
const lens: DiscoveredVendorDto = {
  googlePlaceId: "ChIJ-lens",
  name: "Lens Studio",
  rating: null,
  ratingCount: null,
  address: null,
  myVendor: { id: "6aeb2fe70d805e865a620ab9", archived: false },
};
const pixelDetails: DiscoveredPlaceDetailsDto = {
  ...pixel,
  phone: "+91 98765 43210",
  website: "https://pixel.example/",
};

type Result = { status: number; body: unknown };
/** Handlers by "METHOD /path"; they get the query and body. */
let routes: Record<string, (query: URLSearchParams, body: unknown) => Result>;
const calls: { method: string; path: string; query: URLSearchParams; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const parsed = new URL(url, "http://localhost");
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, path: parsed.pathname, query: parsed.searchParams, body });
  const handler = routes[`${method} ${parsed.pathname}`];
  const result = handler
    ? handler(parsed.searchParams, body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

const data = (value: unknown) => ({ status: 200, body: { data: value } });
const failure = (status: number, code: string, details?: Record<string, string>) => ({
  status,
  body: { error: { code, message: "x", details } },
});
const searches = () => calls.filter((call) => call.path === "/api/vendor-discovery/search");

function renderScreen(defaultNear: string | null = "Dehradun, Uttarakhand") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const element: ReactElement = (
    <DiscoverScreen defaultNear={defaultNear} timeZone="Asia/Kolkata" />
  );
  return render(
    <QueryClientProvider client={client}>
      {element} <AppToaster />
    </QueryClientProvider>,
  );
}

const searchForm = () => within(screen.getByRole("search", { name: DISCOVER.title }));

async function searchFor(category: string) {
  fireEvent.click(searchForm().getByRole("radio", { name: category }));
  fireEvent.click(searchForm().getByRole("button", { name: DISCOVER.form.search }));
  return screen.findByRole(
    "heading",
    { name: /results? for/ },
    // The first render of the file can be slow on a busy machine.
    { timeout: 5000 },
  );
}

beforeEach(() => {
  routes = {
    "GET /api/vendor-discovery/search": () => data([pixel, lens]),
    "GET /api/vendor-discovery/places/ChIJ-pixel": () => data(pixelDetails),
    "GET /api/events": () => data([mehendi]),
  };
  calls.length = 0;
  search = "";
  push.mockClear();
  window.history.replaceState(null, "", "/app/vendors/discover");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<DiscoverScreen />", () => {
  it("waits for a search, starting near the wedding's city", async () => {
    renderScreen();

    expect(screen.getByText(DISCOVER.intro.title)).toBeInTheDocument();
    expect(searchForm().getByRole("textbox", { name: DISCOVER.form.near.label })).toHaveValue(
      "Dehradun, Uttarakhand",
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(searches()).toHaveLength(0);
  });

  it("asks for a category and a place before searching", async () => {
    renderScreen(null);

    fireEvent.click(searchForm().getByRole("button", { name: DISCOVER.form.search }));

    expect(await screen.findByText(DISCOVER.form.categoryRequired)).toBeInTheDocument();
    expect(screen.getByText(DISCOVER.form.nearRequired)).toBeInTheDocument();
    expect(searches()).toHaveLength(0);
  });

  it("shows results with ratings, Google attribution and what's already saved", async () => {
    renderScreen();
    fireEvent.change(searchForm().getByRole("textbox", { name: /Keywords/ }), {
      target: { value: " candid " },
    });

    const heading = await searchFor("Photographer");

    expect(heading).toHaveTextContent("2 results for photographer near Dehradun, Uttarakhand");
    expect(Object.fromEntries(searches()[0]!.query)).toEqual({
      category: "PHOTOGRAPHER",
      near: "Dehradun, Uttarakhand",
      query: "candid",
    });
    expect(window.location.search).toBe(
      "?category=PHOTOGRAPHER&near=Dehradun%2C+Uttarakhand&q=candid",
    );
    expect(screen.getByText(DISCOVER.attribution)).toBeInTheDocument();

    const pixelCard = within(
      screen.getByRole("heading", { name: "Pixel Photography" }).closest("li")!,
    );
    expect(pixelCard.getByText("Rated 4.8 out of 5")).toBeInTheDocument();
    expect(pixelCard.getByText("· 1,212 reviews")).toBeInTheDocument();
    expect(pixelCard.getByRole("link", { name: /Open in Google Maps/ })).toHaveAttribute(
      "href",
      expect.stringContaining("query_place_id=ChIJ-pixel"),
    );
    expect(
      pixelCard.getByRole("button", { name: DISCOVER.addLabel("Pixel Photography") }),
    ).toBeInTheDocument();

    const lensCard = within(screen.getByRole("heading", { name: "Lens Studio" }).closest("li")!);
    expect(lensCard.getByText(DISCOVER.noRating)).toBeInTheDocument();
    expect(lensCard.getByText(DISCOVER.inMyVendors)).toBeInTheDocument();
    expect(lensCard.getByRole("link", { name: DISCOVER.viewLabel("Lens Studio") })).toHaveAttribute(
      "href",
      "/app/vendors/6aeb2fe70d805e865a620ab9",
    );
    expect(lensCard.queryByRole("button")).toBeNull();
  });

  it("shows the search from the address without asking for it again", async () => {
    search = "category=VENUE&near=Jaipur&q=lawns";
    renderScreen();

    expect(
      await screen.findByRole(
        "heading",
        { name: /results? for venue near Jaipur/ },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(Object.fromEntries(searches()[0]!.query)).toEqual({
      category: "VENUE",
      near: "Jaipur",
      query: "lawns",
    });
    expect(searchForm().getByRole("radio", { name: "Venue" })).toBeChecked();
  });

  it("adds a result through the form pre-filled from Google and marks it saved", async () => {
    let posted: unknown;
    routes["POST /api/vendors/from-place"] = (_query, body) => {
      posted = body;
      const saved: Partial<VendorDto> = {
        id: "6aeb2fe70d805e865a620ac1",
        name: "Pixel Photography",
        googlePlaceId: "ChIJ-pixel",
      };
      return { status: 201, body: { data: saved } };
    };
    renderScreen();
    await searchFor("Photographer");

    fireEvent.click(screen.getByRole("button", { name: DISCOVER.addLabel("Pixel Photography") }));

    const form = within(await screen.findByRole("dialog"));
    expect(await form.findByText(DISCOVER.prefill.note)).toBeInTheDocument();
    expect(form.getByRole("textbox", { name: "Vendor name" })).toHaveValue("Pixel Photography");
    expect(form.getByRole("textbox", { name: /Phone/ })).toHaveValue("+91 98765 43210");
    expect(form.getByRole("textbox", { name: /Website/ })).toHaveValue("https://pixel.example/");
    expect(form.getByRole("textbox", { name: /Address/ })).toHaveValue(
      "Rajpur Road, Dehradun, Uttarakhand",
    );
    fireEvent.change(form.getByRole("textbox", { name: /Contact person/ }), {
      target: { value: "Rohit" },
    });
    fireEvent.click(form.getByRole("button", { name: "Save vendor" }));

    expect(await screen.findByText(DISCOVER.added("Pixel Photography"))).toBeInTheDocument();
    expect(posted).toMatchObject({
      googlePlaceId: "ChIJ-pixel",
      name: "Pixel Photography",
      category: "PHOTOGRAPHER",
      contactPerson: "Rohit",
      phone: "+91 98765 43210",
    });
    const pixelCard = within(
      screen.getByRole("heading", { name: "Pixel Photography" }).closest("li")!,
    );
    await waitFor(() => expect(pixelCard.getByText(DISCOVER.inMyVendors)).toBeInTheDocument());
    // Marked from the saved vendor, not by searching Google again.
    expect(searches()).toHaveLength(1);
  });

  it("restores an archived place from the pre-filled form (QA D1)", async () => {
    const archivedId = "6aeb2fe70d805e865a620ab7";
    routes["GET /api/vendor-discovery/search"] = () =>
      data([{ ...pixel, myVendor: { id: archivedId, archived: true } }, lens]);
    let posted: unknown;
    routes["POST /api/vendors/from-place"] = (_query, body) => {
      posted = body;
      const saved: Partial<VendorDto> = {
        id: archivedId,
        name: "Pixel Photography",
        googlePlaceId: "ChIJ-pixel",
      };
      return { status: 201, body: { data: saved } };
    };
    renderScreen();
    await searchFor("Photographer");

    const pixelCard = within(
      screen.getByRole("heading", { name: "Pixel Photography" }).closest("li")!,
    );
    expect(pixelCard.getByText(DISCOVER.archivedInMyVendors)).toBeInTheDocument();
    // The lens card (active in My Vendors) offers no restore.
    expect(screen.getAllByRole("button", { name: /^Restore / })).toHaveLength(1);
    fireEvent.click(
      pixelCard.getByRole("button", { name: DISCOVER.restoreLabel("Pixel Photography") }),
    );

    const form = within(await screen.findByRole("dialog"));
    expect(await form.findByText(DISCOVER.prefill.restoreNote)).toBeInTheDocument();
    fireEvent.click(form.getByRole("button", { name: "Save vendor" }));

    expect(await screen.findByText(DISCOVER.restored("Pixel Photography"))).toBeInTheDocument();
    expect(posted).toMatchObject({ googlePlaceId: "ChIJ-pixel", name: "Pixel Photography" });
    await waitFor(() => expect(pixelCard.getByText(DISCOVER.inMyVendors)).toBeInTheDocument());
    expect(pixelCard.queryByRole("button", { name: /^Restore / })).toBeNull();
  });

  it("says when the place was added by someone else meanwhile", async () => {
    routes["POST /api/vendors/from-place"] = () => failure(409, "CONFLICT");
    renderScreen();
    await searchFor("Photographer");
    fireEvent.click(screen.getByRole("button", { name: DISCOVER.addLabel("Pixel Photography") }));
    const form = within(await screen.findByRole("dialog"));
    await form.findByText(DISCOVER.prefill.note);

    fireEvent.click(form.getByRole("button", { name: "Save vendor" }));

    expect(await form.findByText(DISCOVER.prefill.conflict.title)).toBeInTheDocument();
    fireEvent.click(form.getByRole("button", { name: DISCOVER.prefill.conflict.action }));
    expect(push).toHaveBeenCalledWith("/app/vendors");
  });

  it("explains when Google is unavailable and offers adding by hand", async () => {
    routes["GET /api/vendor-discovery/search"] = () => failure(502, "EXTERNAL_SERVICE_ERROR");
    renderScreen();
    fireEvent.click(searchForm().getByRole("radio", { name: "DJ" }));
    fireEvent.click(searchForm().getByRole("button", { name: DISCOVER.form.search }));

    const alert = within(await screen.findByRole("alert", {}, { timeout: 5000 }));
    expect(alert.getByText(DISCOVER.unavailable.title)).toBeInTheDocument();
    expect(alert.getByRole("link", { name: DISCOVER.unavailable.addByHand })).toHaveAttribute(
      "href",
      "/app/vendors?new=1",
    );

    routes["GET /api/vendor-discovery/search"] = () => data([]);
    fireEvent.click(alert.getByRole("button", { name: DISCOVER.unavailable.retry }));
    expect(await screen.findByText(DISCOVER.empty.title)).toBeInTheDocument();
  });

  it("says when the hour's searches are used up, without a retry", async () => {
    routes["GET /api/vendor-discovery/search"] = () => failure(429, "RATE_LIMITED");
    renderScreen();
    fireEvent.click(searchForm().getByRole("radio", { name: "DJ" }));
    fireEvent.click(searchForm().getByRole("button", { name: DISCOVER.form.search }));

    const alert = within(await screen.findByRole("alert", {}, { timeout: 5000 }));
    expect(alert.getByText(DISCOVER.rateLimited.title)).toBeInTheDocument();
    expect(alert.queryByRole("button", { name: DISCOVER.unavailable.retry })).toBeNull();
  });
});
