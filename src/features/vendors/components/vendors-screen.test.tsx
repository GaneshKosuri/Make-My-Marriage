// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chooseOption } from "@/components/ui/select-field.test-helpers";
import type { EventDto } from "@/modules/events/event.types";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { VENDORS } from "../vendors-content";
import { VendorDetailScreen } from "./vendor-detail-screen";
import { VendorsScreen } from "./vendors-screen";
import { AppToaster } from "@/components/ui/toaster";

/** The address's query string, as `useSearchParams` reports it. */
let search = "";
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push }),
  usePathname: () => "/app/vendors",
  useSearchParams: () => new URLSearchParams(search),
}));

const MEHENDI = "6aeb2fe70d805e865a620a01";
const ROKA = "6aeb2fe70d805e865a620a09";

const mehendi: EventDto = {
  id: MEHENDI,
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

const vendor = (id: string, name: string, extra: Partial<VendorDto> = {}): VendorDto => ({
  id,
  name,
  category: "PHOTOGRAPHER",
  contactPerson: null,
  phone: null,
  email: null,
  address: null,
  website: null,
  totalAgreedCostPaise: null,
  events: [],
  notes: null,
  source: "MANUAL",
  googlePlaceId: null,
  archivedAt: null,
  version: 0,
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
  ...extra,
});

const pixel = vendor("6aeb2fe70d805e865a620ab1", "Pixel Photography", {
  contactPerson: "Rohit",
  phone: "+91 98765 43210",
  email: "rohit@pixel.example",
  website: "https://pixelphotography.in/",
  address: "Rajpur Road, Dehradun",
  totalAgreedCostPaise: 20_000_000,
  notes: "Drone included",
  version: 3,
  events: [
    { id: MEHENDI, name: "Mehendi", startsAt: mehendi.startsAt, archivedAt: null },
    {
      id: ROKA,
      name: "Roka",
      startsAt: "2026-10-01T12:00:00.000Z",
      archivedAt: "2026-10-30T00:00:00.000Z",
    },
  ],
});
const beatBox = vendor("6aeb2fe70d805e865a620ab2", "Beat Box DJs", {
  category: "DJ",
  source: "GOOGLE_PLACES",
});

type Handler = (body: unknown) => { status: number; body: unknown };
let routes: Record<string, Handler>;
const calls: { method: string; url: string; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, url, body });
  const handler = routes[`${method} ${url}`];
  const result = handler
    ? handler(body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

const data = (value: unknown) => ({ status: 200, body: { data: value } });
const page = (items: VendorDto[]) => ({
  status: 200,
  body: {
    data: items,
    pagination: { page: 1, limit: 20, total: items.length, totalPages: items.length ? 1 : 0 },
  },
});
const failure = (status: number, code: string, details?: Record<string, string>) => ({
  status,
  body: { error: { code, message: "x", details } },
});
const LIST = "GET /api/vendors?page=1&limit=20";

function renderWithClient(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      {element} <AppToaster />
    </QueryClientProvider>,
  );
}

const dialog = () => within(screen.getByRole("dialog"));
const list = () => within(screen.getByRole("region", { name: VENDORS.title }));

beforeEach(() => {
  routes = {
    [LIST]: () => page([beatBox, pixel]),
    "GET /api/events?includeArchived=false": () => data([mehendi]),
  };
  calls.length = 0;
  search = "";
  push.mockClear();
  window.history.replaceState(null, "", "/app/vendors");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<VendorsScreen />", () => {
  it("lists vendors with category, contact, agreed cost and events", async () => {
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    const row = within(
      (
        await screen.findByRole(
          "link",
          { name: VENDORS.open("Pixel Photography") },
          // The first render of the file can be slow on a busy machine.
          { timeout: 5000 },
        )
      ).closest("li")!,
    );
    expect(row.getByText("Photographer")).toBeInTheDocument();
    expect(row.getByText("Rohit · +91 98765 43210")).toBeInTheDocument();
    expect(row.getByText("Agreed ₹2,00,000")).toBeInTheDocument();
    expect(row.getByText("Mehendi")).toBeInTheDocument();
    expect(row.getByText("Roka (archived)")).toBeInTheDocument();
    expect(list().getByText(VENDORS.fromGoogle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: VENDORS.discover })).toHaveAttribute(
      "href",
      "/app/vendors/discover",
    );
  });

  it("filters by category and archived vendors, keeping them in the address", async () => {
    routes[`${LIST}&category=DJ`] = () => page([beatBox]);
    routes[`${LIST}&category=DJ&includeArchived=true`] = () =>
      page([
        beatBox,
        vendor("6aeb2fe70d805e865a620ab3", "Old Florist", {
          category: "FLORIST",
          archivedAt: "2026-11-10T00:00:00.000Z",
        }),
      ]);
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    await screen.findByRole("link", { name: VENDORS.open("Pixel Photography") });

    await chooseOption(VENDORS.filters.category, "DJ");
    await waitFor(() => expect(list().queryByText("Pixel Photography")).not.toBeInTheDocument());
    expect(window.location.search).toBe("?category=DJ");

    fireEvent.click(screen.getByRole("switch", { name: VENDORS.filters.showArchived }));
    expect(await list().findByText("Old Florist")).toBeInTheDocument();
    expect(list().getByText(VENDORS.archived)).toBeInTheDocument();
    // Archived vendors can't be edited from the list.
    expect(
      screen.queryByRole("button", { name: VENDORS.edit("Old Florist") }),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe("?category=DJ&archived=1");
  });

  it("adds a vendor: rupees become paise, blanks are left out as null", async () => {
    routes["POST /api/vendors"] = (body) => ({
      status: 201,
      body: { data: vendor("6aeb2fe70d805e865a620ab9", (body as { name: string }).name) },
    });
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    fireEvent.click(await screen.findByRole("button", { name: VENDORS.add }));

    const form = dialog();
    fireEvent.change(await form.findByLabelText(VENDORS.form.fields.name.label), {
      target: { value: " Spice Route Caterers " },
    });
    await chooseOption(VENDORS.form.fields.category.label, "Caterer", form);
    fireEvent.change(form.getByLabelText(VENDORS.form.fields.agreedCost.label), {
      target: { value: "4,20,000.50" },
    });
    fireEvent.change(form.getByLabelText(VENDORS.form.fields.website.label), {
      target: { value: "spiceroute.in" },
    });
    fireEvent.click(form.getByRole("checkbox", { name: /Mehendi/ }));
    fireEvent.click(form.getByRole("button", { name: VENDORS.form.save }));

    expect(await screen.findByText("Spice Route Caterers added.")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      name: "Spice Route Caterers",
      category: "CATERER",
      contactPerson: null,
      phone: null,
      email: null,
      website: "spiceroute.in",
      address: null,
      totalAgreedCostPaise: 42_000_050,
      eventIds: [MEHENDI],
      notes: null,
    });
  });

  it("explains a missing category and an amount it can't read", async () => {
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    fireEvent.click(await screen.findByRole("button", { name: VENDORS.add }));
    const form = dialog();
    fireEvent.change(await form.findByLabelText(VENDORS.form.fields.name.label), {
      target: { value: "Spice Route" },
    });
    fireEvent.change(form.getByLabelText(VENDORS.form.fields.agreedCost.label), {
      target: { value: "four lakh" },
    });
    fireEvent.click(form.getByRole("button", { name: VENDORS.form.save }));

    expect(await form.findByText("Choose a category")).toBeInTheDocument();
    expect(form.getByText(VENDORS.form.fields.agreedCost.invalid)).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("edits only what changed, with the version, and offers a reload on a conflict", async () => {
    routes[`PATCH /api/vendors/${pixel.id}`] = () => failure(409, "CONFLICT");
    routes[`GET /api/vendors/${pixel.id}`] = () =>
      data({ ...pixel, notes: "Drone and candid team", version: 4 });
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    fireEvent.click(await screen.findByRole("button", { name: VENDORS.edit("Pixel Photography") }));

    const form = dialog();
    expect(await form.findByDisplayValue("2,00,000")).toBeInTheDocument();
    fireEvent.change(form.getByLabelText(VENDORS.form.fields.agreedCost.label), {
      target: { value: "2,50,000" },
    });
    fireEvent.click(form.getByRole("button", { name: VENDORS.form.save }));

    expect(await form.findByText(VENDORS.form.conflict.title)).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      totalAgreedCostPaise: 25_000_000,
      version: 3,
    });
    fireEvent.click(form.getByRole("button", { name: VENDORS.form.conflict.action }));
    expect(await dialog().findByDisplayValue("Drone and candid team")).toBeInTheDocument();
  });

  it("explains a vendor someone archived meanwhile instead of offering a save that always fails (QA V1)", async () => {
    routes[`PATCH /api/vendors/${pixel.id}`] = () => failure(409, "CONFLICT");
    routes[`GET /api/vendors/${pixel.id}`] = () =>
      data({ ...pixel, archivedAt: "2026-11-24T10:00:00.000Z", version: 4 });
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    fireEvent.click(await screen.findByRole("button", { name: VENDORS.edit("Pixel Photography") }));
    const form = dialog();
    expect(await form.findByDisplayValue("2,00,000")).toBeInTheDocument();
    fireEvent.change(form.getByLabelText(VENDORS.form.fields.agreedCost.label), {
      target: { value: "2,50,000" },
    });
    fireEvent.click(form.getByRole("button", { name: VENDORS.form.save }));
    fireEvent.click(await form.findByRole("button", { name: VENDORS.form.conflict.action }));

    expect(await dialog().findByText(VENDORS.form.archived.title)).toBeInTheDocument();
    expect(dialog().queryByRole("button", { name: VENDORS.form.save })).toBeNull();
  });

  it("opens the add form from ?new=1 and drops the flag", async () => {
    search = "new=1";
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    expect(await screen.findByRole("dialog", { name: VENDORS.form.addTitle })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("invites the first vendor, or discovery, when there are none", async () => {
    routes[LIST] = () => page([]);
    renderWithClient(<VendorsScreen timeZone="Asia/Kolkata" />);
    expect(await screen.findByText(VENDORS.empty.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: VENDORS.empty.action })).toBeInTheDocument();
  });
});

describe("<VendorDetailScreen />", () => {
  const EXPENSES_FOR_PIXEL = `GET /api/expenses?vendorId=${pixel.id}&limit=100`;
  const recorded = (id: string, title: string, amountPaise: number) => ({
    id,
    title,
    amountPaise,
    currency: "INR",
    expenseDate: "2026-09-01",
    category: "PHOTOGRAPHY",
    event: null,
    vendor: { id: pixel.id, name: pixel.name, category: "PHOTOGRAPHER", archivedAt: null },
    notes: null,
    version: 0,
    createdAt: "2026-11-18T00:00:00.000Z",
    updatedAt: "2026-11-18T00:00:00.000Z",
  });

  beforeEach(() => {
    routes[`GET /api/vendors/${pixel.id}`] = () => data(pixel);
    routes[EXPENSES_FOR_PIXEL] = () => ({
      status: 200,
      body: { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    });
  });

  it("shows what has been recorded for the vendor, never a balance", async () => {
    routes[EXPENSES_FOR_PIXEL] = () => ({
      status: 200,
      body: {
        data: [
          recorded("6aeb2fe70d805e865a620ac1", "Photographer advance", 5_000_000),
          recorded("6aeb2fe70d805e865a620ac2", "Album printing", 1_250_050),
        ],
        pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
      },
    });
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);
    const card = within(await screen.findByRole("region", { name: "Expenses for this vendor" }));
    expect(await card.findByText("₹62,500.50")).toBeInTheDocument();
    expect(card.getByText("Photographer advance")).toBeInTheDocument();
    expect(card.getByText("₹12,500.50")).toBeInTheDocument();
    expect(card.queryByText(/balance|remaining|due/i)).not.toBeInTheDocument();
    expect(card.getByRole("link", { name: /Add expense/ })).toHaveAttribute(
      "href",
      `/app/expenses?new=1&vendorId=${pixel.id}`,
    );
  });

  it("says when nothing is recorded yet, and offers no add link on an archived vendor", async () => {
    routes[`GET /api/vendors/${pixel.id}`] = () =>
      data({ ...pixel, archivedAt: "2026-11-10T06:30:00.000Z" });
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);
    const card = within(await screen.findByRole("region", { name: "Expenses for this vendor" }));
    expect(await card.findByText("No expenses recorded for this vendor yet.")).toBeInTheDocument();
    expect(card.queryByRole("link", { name: /Add expense/ })).not.toBeInTheDocument();
  });

  it("shows the agreed cost, contact actions and the events the vendor works at", async () => {
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Pixel Photography" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₹2,00,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: VENDORS.detail.call })).toHaveAttribute(
      "href",
      "tel:+919876543210",
    );
    expect(screen.getByRole("link", { name: VENDORS.detail.email })).toHaveAttribute(
      "href",
      "mailto:rohit@pixel.example",
    );
    const website = screen.getByRole("link", { name: VENDORS.detail.website });
    expect(website).toHaveAttribute("href", "https://pixelphotography.in/");
    expect(website).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText("pixelphotography.in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mehendi" })).toHaveAttribute(
      "href",
      `/app/events/${MEHENDI}`,
    );
    expect(screen.getByText("Drone included")).toBeInTheDocument();
  });

  it("archives after confirming, then returns to the list", async () => {
    routes[`DELETE /api/vendors/${pixel.id}`] = () => ({ status: 200, body: { success: true } });
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);

    fireEvent.click(await screen.findByRole("button", { name: VENDORS.detail.archive }));
    const confirm = within(
      screen.getByRole("dialog", {
        name: VENDORS.detail.confirmArchive.title("Pixel Photography"),
      }),
    );
    expect(confirm.getByText(VENDORS.detail.confirmArchive.description)).toBeInTheDocument();
    fireEvent.click(confirm.getByRole("button", { name: VENDORS.detail.confirmArchive.confirm }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/vendors"));
    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
  });

  it("keeps an archived vendor read-only", async () => {
    routes[`GET /api/vendors/${pixel.id}`] = () =>
      data({ ...pixel, archivedAt: "2026-11-10T06:30:00.000Z" });
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);

    expect(await screen.findByText(/Archived on 10 November 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: VENDORS.detail.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: VENDORS.detail.archive })).not.toBeInTheDocument();
  });

  it("says when the vendor can't be found (another wedding's)", async () => {
    routes[`GET /api/vendors/${pixel.id}`] = () => failure(404, "NOT_FOUND");
    renderWithClient(<VendorDetailScreen vendorId={pixel.id} timeZone="Asia/Kolkata" />);
    expect(await screen.findByText(VENDORS.detail.notFound.title)).toBeInTheDocument();
  });
});
