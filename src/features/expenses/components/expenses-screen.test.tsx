// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chooseOption, selectedOption } from "@/components/ui/select-field.test-helpers";
import type { EventDto } from "@/modules/events/event.types";
import type { ExpenseDto, ExpenseSummaryDto } from "@/modules/expenses/expense.types";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { EXPENSES } from "../expenses-content";
import { ExpensesScreen } from "./expenses-screen";

/** The address's query string, as `useSearchParams` reports it. */
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/expenses",
  useSearchParams: () => new URLSearchParams(search),
}));

const SANGEET = "6aeb2fe70d805e865a620a01";
const PIXEL = "6aeb2fe70d805e865a620ab1";

const sangeet: EventDto = {
  id: SANGEET,
  name: "Sangeet",
  type: null,
  startsAt: "2027-02-13T13:30:00.000Z",
  endsAt: null,
  venueName: null,
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 0,
};

const pixel: VendorDto = {
  id: PIXEL,
  name: "Pixel Photography",
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
};

const expense = (id: string, title: string, extra: Partial<ExpenseDto> = {}): ExpenseDto => ({
  id,
  title,
  amountPaise: 5_000_000,
  currency: "INR",
  expenseDate: "2026-09-01",
  category: "PHOTOGRAPHY",
  event: null,
  vendor: null,
  notes: null,
  version: 0,
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
  ...extra,
});

const advance = expense("6aeb2fe70d805e865a620ac1", "Photographer advance", {
  vendor: { id: PIXEL, name: "Pixel Photography", category: "PHOTOGRAPHER", archivedAt: null },
  version: 2,
});
const venue = expense("6aeb2fe70d805e865a620ac2", "Venue advance", {
  amountPaise: 30_000_000,
  category: "VENUE",
  expenseDate: "2026-08-15",
  event: { id: SANGEET, name: "Sangeet", startsAt: sangeet.startsAt, archivedAt: null },
});

const summary: ExpenseSummaryDto = {
  totalExpensePaise: 35_000_000,
  currency: "INR",
  byCategory: [
    { category: "VENUE", amountPaise: 30_000_000 },
    { category: "PHOTOGRAPHY", amountPaise: 5_000_000 },
  ],
};

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
const page = (items: unknown[], total = items.length) => ({
  status: 200,
  body: {
    data: items,
    pagination: { page: 1, limit: 20, total, totalPages: total ? 1 : 0 },
  },
});
const LIST = "GET /api/expenses?page=1&limit=20";

function renderWithClient(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

const dialog = () => within(screen.getByRole("dialog"));
const list = async () => within(await screen.findByRole("region", { name: EXPENSES.title }));

beforeEach(() => {
  routes = {
    [LIST]: () => page([advance, venue]),
    "GET /api/expenses?page=1&limit=1": () => page([advance], 2),
    "GET /api/expenses/summary": () => data(summary),
    "GET /api/events?includeArchived=false": () => data([sangeet]),
    "GET /api/events?includeArchived=true": () => data([sangeet]),
    "GET /api/vendors?limit=100": () => page([pixel]),
    "GET /api/vendors?limit=100&includeArchived=true": () => page([pixel]),
  };
  calls.length = 0;
  search = "";
  window.history.replaceState(null, "", "/app/expenses");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<ExpensesScreen />", () => {
  it("shows the total and a bar per category, with no budget figures", async () => {
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    const card = within(await screen.findByRole("region", { name: EXPENSES.summary.label }));
    expect(card.getByText("₹3,50,000")).toBeInTheDocument();
    expect(card.getByText(EXPENSES.summary.count(2))).toBeInTheDocument();
    expect(card.getByText("Venue")).toBeInTheDocument();
    expect(card.getByText("₹3,00,000")).toBeInTheDocument();
    expect(card.queryByText(/budget|remaining|balance|%/i)).not.toBeInTheDocument();
  });

  it("lists expenses with amount, date, category, event and a link to the vendor", async () => {
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    const rows = await list();
    const row = within(rows.getByText("Photographer advance").closest("li")!);
    expect(row.getByText("₹50,000")).toBeInTheDocument();
    expect(row.getByText("1 Sept 2026")).toBeInTheDocument();
    expect(row.getByText("Photography")).toBeInTheDocument();
    expect(row.getByRole("link", { name: "Pixel Photography" })).toHaveAttribute(
      "href",
      `/app/vendors/${PIXEL}`,
    );
    expect(rows.getByText("Sangeet")).toBeInTheDocument();
  });

  it("filters by category and keeps it in the address", async () => {
    routes[`${LIST}&category=VENUE`] = () => page([venue]);
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    const rows = await list();
    rows.getByText("Photographer advance");

    await chooseOption(EXPENSES.filters.category, "Venue");
    await waitFor(() => expect(rows.queryByText("Photographer advance")).not.toBeInTheDocument());
    expect(window.location.search).toBe("?category=VENUE");
  });

  it("adds an expense: rupees become paise, choosing a vendor fills the category", async () => {
    routes["POST /api/expenses"] = (body) => ({
      status: 201,
      body: { data: expense("6aeb2fe70d805e865a620ac9", (body as { title: string }).title) },
    });
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    fireEvent.click(await screen.findByRole("button", { name: EXPENSES.add }));

    const form = dialog();
    fireEvent.change(await form.findByLabelText(EXPENSES.form.fields.title.label), {
      target: { value: "Second shoot advance" },
    });
    fireEvent.change(form.getByLabelText(EXPENSES.form.fields.amount.label), {
      target: { value: "25,000.50" },
    });
    await chooseOption(EXPENSES.form.fields.vendor.label, "Pixel Photography", form);
    expect(selectedOption(EXPENSES.form.fields.category.label, form)).toBe("Photography");
    expect(form.getByText(EXPENSES.form.fields.vendor.categoryFromVendor)).toBeInTheDocument();
    fireEvent.click(form.getByRole("button", { name: EXPENSES.form.save }));

    expect(await screen.findByText('"Second shoot advance" added.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      title: "Second shoot advance",
      amountPaise: 2_500_050,
      // Today in the wedding's time zone, as the page passed it.
      expenseDate: "2026-11-18",
      category: "PHOTOGRAPHY",
      eventId: null,
      vendorId: PIXEL,
      notes: null,
    });
  });

  it("refuses a zero amount before sending", async () => {
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    fireEvent.click(await screen.findByRole("button", { name: EXPENSES.add }));
    const form = dialog();
    fireEvent.change(await form.findByLabelText(EXPENSES.form.fields.title.label), {
      target: { value: "Tips" },
    });
    fireEvent.change(form.getByLabelText(EXPENSES.form.fields.amount.label), {
      target: { value: "0" },
    });
    fireEvent.click(form.getByRole("button", { name: EXPENSES.form.save }));
    expect(await form.findByText(EXPENSES.form.fields.amount.zero)).toBeInTheDocument();
    // The error line, not the dropdown's placeholder.
    expect(form.getByText("Choose a category", { selector: "p" })).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("edits only what changed, and deletes after confirming", async () => {
    routes[`PATCH /api/expenses/${advance.id}`] = (body) =>
      data({ ...advance, ...(body as object), version: 3 });
    routes[`DELETE /api/expenses/${advance.id}`] = () => ({
      status: 200,
      body: { success: true },
    });
    renderWithClient(<ExpensesScreen today="2026-11-18" />);

    fireEvent.click(
      await screen.findByRole("button", { name: EXPENSES.edit("Photographer advance") }),
    );
    const form = dialog();
    expect(await form.findByDisplayValue("50,000")).toBeInTheDocument();
    fireEvent.change(form.getByLabelText(EXPENSES.form.fields.amount.label), {
      target: { value: "55,000" },
    });
    fireEvent.click(form.getByRole("button", { name: EXPENSES.form.save }));
    expect(await screen.findByText('"Photographer advance" saved.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      amountPaise: 5_500_000,
      version: 2,
    });

    fireEvent.click(screen.getByRole("button", { name: EXPENSES.edit("Photographer advance") }));
    fireEvent.click(await dialog().findByRole("button", { name: EXPENSES.form.delete }));
    expect(
      dialog().getByText(EXPENSES.form.confirmDelete.prompt("Photographer advance", "₹50,000")),
    ).toBeInTheDocument();
    fireEvent.click(dialog().getByRole("button", { name: EXPENSES.form.confirmDelete.confirm }));
    expect(await screen.findByText('"Photographer advance" deleted.')).toBeInTheDocument();
  });

  it("opens the add form for a vendor from a vendor's page link", async () => {
    search = `new=1&vendorId=${PIXEL}`;
    routes[`${LIST}&vendorId=${PIXEL}`] = () => page([advance]);
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    const form = within(await screen.findByRole("dialog", { name: EXPENSES.form.addTitle }));
    await waitFor(() =>
      expect(selectedOption(EXPENSES.form.fields.vendor.label, form)).toBe("Pixel Photography"),
    );
    expect(selectedOption(EXPENSES.form.fields.category.label, form)).toBe("Photography");
    await waitFor(() => expect(window.location.search).toBe(`?vendorId=${PIXEL}`));
  });

  it("invites the first expense when there are none", async () => {
    routes[LIST] = () => page([]);
    routes["GET /api/expenses/summary"] = () =>
      data({ totalExpensePaise: 0, currency: "INR", byCategory: [] });
    renderWithClient(<ExpensesScreen today="2026-11-18" />);
    expect(await screen.findByText(EXPENSES.empty.title)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: EXPENSES.summary.label })).not.toBeInTheDocument();
  });
});
