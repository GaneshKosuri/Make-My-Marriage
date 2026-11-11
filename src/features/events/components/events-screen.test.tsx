// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";

import { fieldValue, typeDate, typeTime } from "@/components/ui/date-time-fields.test-helpers";

import { EVENTS } from "../events-content";
import { EventsScreen } from "./events-screen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/events",
}));

const event = (id: string, name: string, startsAt: string, extra: Partial<EventDto> = {}) =>
  ({
    id,
    name,
    type: null,
    startsAt,
    endsAt: null,
    venueName: null,
    address: null,
    description: null,
    dressCode: null,
    archivedAt: null,
    version: 0,
    ...extra,
  }) satisfies EventDto;

const roka = event("e1", "Roka", "2026-10-20T06:30:00.000Z");
const mehendi = event("e2", "Mehendi", "2027-02-12T10:30:00.000Z", {
  type: "MEHENDI",
  endsAt: "2027-02-12T14:30:00.000Z",
  venueName: "Royal Garden",
  dressCode: "Green / Traditional",
});
const wedding = event("e3", "Wedding", "2027-02-14T12:30:00.000Z");
const engagement = event("e4", "Engagement", "2026-09-01T12:30:00.000Z", {
  archivedAt: "2026-10-01T00:00:00.000Z",
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
const LIST = "GET /api/events?includeArchived=false";
const LIST_ALL = "GET /api/events?includeArchived=true";

function renderScreen(startAdding = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EventsScreen
        timeZone="Asia/Kolkata"
        weddingDate="2027-02-14"
        today="2026-11-04"
        now="2026-11-04T06:30:00.000Z"
        startAdding={startAdding}
      />
    </QueryClientProvider>,
  );
}

const region = (name: string) => within(screen.getByRole("region", { name }));
const dialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  routes = { [LIST]: () => data([roka, mehendi, wedding]) };
  calls.length = 0;
  replace.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<EventsScreen />", () => {
  it("splits upcoming and past events, with times in the wedding's time zone", async () => {
    renderScreen();

    expect(await screen.findByRole("region", { name: EVENTS.upcoming })).toBeInTheDocument();
    const upcoming = region(EVENTS.upcoming);
    const links = upcoming.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/app/events/e2",
      "/app/events/e3",
    ]);
    expect(upcoming.getByText("4:00 PM – 8:00 PM")).toBeInTheDocument();
    expect(upcoming.getByText("Dress code: Green / Traditional")).toBeInTheDocument();
    expect(region(EVENTS.past).getByRole("link", { name: /Roka/ })).toHaveAttribute(
      "href",
      "/app/events/e1",
    );
    expect(screen.getByText(/Times are in India \(IST\)/)).toBeInTheDocument();
  });

  it("shows archived events only on request", async () => {
    routes[LIST_ALL] = () => data([engagement, roka, mehendi, wedding]);
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: EVENTS.showArchived }));
    const archived = within(await screen.findByRole("region", { name: EVENTS.archived }));
    expect(archived.getByText("Engagement")).toBeInTheDocument();
    expect(within(archived.getByRole("link")).getByText(EVENTS.archivedBadge)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: EVENTS.upcoming })).toBeInTheDocument();
  });

  it("offers the common ceremonies when there are no events", async () => {
    routes[LIST] = () => data([]);
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: "Sangeet" }));
    expect(dialog().getByLabelText("Event name")).toHaveValue("Sangeet");
    expect(dialog().getByRole("radio", { name: "Sangeet" })).toBeChecked();
  });

  it("adds an event: local times become UTC, an earlier end is the next day", async () => {
    let created: EventDto | undefined;
    routes["POST /api/events"] = (body) => {
      created = { ...wedding, id: "e9", ...(body as Partial<EventDto>) };
      return { status: 201, body: { data: created } };
    };
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: EVENTS.add }));
    fireEvent.click(dialog().getByRole("radio", { name: "Haldi" }));
    await typeDate("Date", "2027-02-13", dialog());
    await typeTime("Starts at", "20:00", dialog());
    await typeTime("Ends at", "00:30", dialog());
    expect(dialog().getByText(EVENTS.form.endsNextDay)).toBeInTheDocument();
    fireEvent.change(dialog().getByLabelText("Venue"), { target: { value: " Courtyard " } });
    fireEvent.click(dialog().getByRole("button", { name: EVENTS.form.save }));

    expect(await screen.findByText("Haldi added.")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      name: "Haldi",
      type: "HALDI",
      startsAt: "2027-02-13T14:30:00.000Z",
      endsAt: "2027-02-13T19:00:00.000Z",
      venueName: "Courtyard",
      address: "",
      dressCode: "",
      description: "",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a name the person typed when they pick an occasion", async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: EVENTS.add }));
    fireEvent.change(dialog().getByLabelText("Event name"), {
      target: { value: "Nani's Haldi" },
    });
    fireEvent.click(dialog().getByRole("radio", { name: "Haldi" }));
    expect(dialog().getByLabelText("Event name")).toHaveValue("Nani's Haldi");
  });

  it("shows server field errors on the form", async () => {
    routes["POST /api/events"] = () => ({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "x",
          details: { endsAt: "End the event after it starts" },
        },
      },
    });
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: EVENTS.add }));
    fireEvent.change(dialog().getByLabelText("Event name"), { target: { value: "Dinner" } });
    fireEvent.click(dialog().getByRole("button", { name: EVENTS.form.save }));

    expect(await dialog().findByText("End the event after it starts")).toBeInTheDocument();
    expect(dialog().queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens the add form from ?new=1 and drops the parameter", async () => {
    renderScreen(true);
    expect(screen.getByRole("dialog", { name: EVENTS.form.addTitle })).toBeInTheDocument();
    expect(fieldValue("date")).toBe("2027-02-14");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app/events", { scroll: false }));
  });

  it("offers a retry when the list cannot load", async () => {
    routes[LIST] = () => ({
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "x" } },
    });
    renderScreen();
    expect(await screen.findByText(EVENTS.loadError.title)).toBeInTheDocument();

    routes[LIST] = () => data([mehendi]);
    fireEvent.click(screen.getByRole("button", { name: EVENTS.loadError.retry }));
    expect(await screen.findByRole("link", { name: /Mehendi/ })).toBeInTheDocument();
  });

  it("moves an event that ends while the page is open to Past (review R7)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T06:30:00.000Z"));
    // Ends five minutes after the page was rendered.
    const brunch = event("e8", "Family brunch", "2026-11-04T05:00:00.000Z", {
      endsAt: "2026-11-04T06:35:00.000Z",
    });
    routes[LIST] = () => data([brunch, wedding]);
    try {
      renderScreen();
      const upcoming = await screen.findByRole("region", { name: EVENTS.upcoming });
      expect(within(upcoming).getByText("Family brunch")).toBeInTheDocument();

      vi.setSystemTime(new Date("2026-11-04T06:40:00.000Z"));
      fireEvent.focus(window);

      const past = await screen.findByRole("region", { name: EVENTS.past });
      expect(within(past).getByText("Family brunch")).toBeInTheDocument();
      expect(
        within(screen.getByRole("region", { name: EVENTS.upcoming })).queryByText("Family brunch"),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("says when an event ends the next day or later, as its page does (QA P3-1)", async () => {
    const sangeet = event("e5", "Sangeet", "2027-02-12T14:30:00.000Z", {
      endsAt: "2027-02-12T19:30:00.000Z",
    });
    const allNight = event("e6", "Jagran", "2027-02-12T12:30:00.000Z", {
      endsAt: "2027-02-13T12:30:00.000Z",
    });
    routes[LIST] = () => data([allNight, sangeet]);
    renderScreen();

    const upcoming = within(await screen.findByRole("region", { name: EVENTS.upcoming }));
    expect(upcoming.getByText("8:00 PM – 1:00 AM (next day)")).toBeInTheDocument();
    // Not a bare "6:00 PM – 6:00 PM", which reads like a zero-length event.
    expect(upcoming.getByText("6:00 PM – 6:00 PM (next day)")).toBeInTheDocument();
  });
});
