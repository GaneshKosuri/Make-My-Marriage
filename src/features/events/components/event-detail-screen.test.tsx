// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";

import { TASKS } from "@/features/tasks/tasks-content";

import { EVENTS } from "../events-content";
import { EventDetailScreen } from "./event-detail-screen";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/events/e1",
}));

const DETAIL = EVENTS.detail;
const URL = "/api/events/e1";

const sangeet: EventDto = {
  id: "e1",
  name: "Sangeet",
  type: "SANGEET",
  startsAt: "2027-02-12T14:30:00.000Z",
  endsAt: "2027-02-12T19:30:00.000Z",
  venueName: "The Grand Ballroom",
  address: "Rajpur Road, Dehradun",
  description: "DJ from 9 PM.\nDinner at 10.",
  dressCode: "Indo-western",
  archivedAt: null,
  version: 3,
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
const apiError = (status: number, code: string) => ({
  status,
  body: { error: { code, message: "x" } },
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EventDetailScreen
        eventId="e1"
        timeZone="Asia/Kolkata"
        weddingDate="2027-02-14"
        today="2026-11-04"
      />
    </QueryClientProvider>,
  );
}

const dialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  routes = { [`GET ${URL}`]: () => data(sangeet) };
  calls.length = 0;
  push.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<EventDetailScreen />", () => {
  it("lists the event's tasks and adds one already linked to it", async () => {
    routes["GET /api/tasks?eventId=e1&limit=50"] = () => ({
      status: 200,
      body: {
        data: [
          {
            id: "t1",
            title: "Book the DJ",
            description: null,
            priority: "HIGH",
            status: "TODO",
            dueDate: null,
            completedAt: null,
            assignedMembershipId: null,
            assignee: null,
            event: { id: "e1", name: "Sangeet", archivedAt: null },
            version: 0,
            createdAt: "2026-11-01T00:00:00.000Z",
            updatedAt: "2026-11-01T00:00:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
    });
    renderScreen();

    const card = within(await screen.findByRole("region", { name: TASKS.forEvent.title }));
    expect(await card.findByRole("button", { name: 'Edit "Book the DJ"' })).toBeInTheDocument();
    // The event's own name isn't repeated on each task.
    expect(card.queryByText("Sangeet")).not.toBeInTheDocument();
    expect(card.getByRole("link", { name: TASKS.forEvent.add })).toHaveAttribute(
      "href",
      "/app/tasks?new=1&eventId=e1",
    );
  });

  it("links to the full list when the event has more tasks than its page shows (D8)", async () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      id: `t${index}`,
      title: `Task ${index}`,
      description: null,
      priority: "MEDIUM",
      status: "TODO",
      dueDate: null,
      completedAt: null,
      assignedMembershipId: null,
      assignee: null,
      event: { id: "e1", name: "Sangeet", archivedAt: null },
      version: 0,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    }));
    routes["GET /api/tasks?eventId=e1&limit=50"] = () => ({
      status: 200,
      body: { data: many, pagination: { page: 1, limit: 50, total: 60, totalPages: 2 } },
    });
    renderScreen();

    const card = within(await screen.findByRole("region", { name: TASKS.forEvent.title }));
    expect(await card.findAllByRole("button", { name: /^Edit "Task/ })).toHaveLength(50);
    expect(card.getByRole("link", { name: TASKS.forEvent.all })).toHaveAttribute(
      "href",
      "/app/tasks?eventId=e1",
    );
  });

  it("shows when and where in the wedding's time zone, with a maps link", async () => {
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Sangeet", level: 1 })).toBeInTheDocument();
    // The name already says the occasion.
    expect(screen.getByText(DETAIL.eyebrow)).toBeInTheDocument();
    expect(screen.getByText("Friday, 12 February 2027")).toBeInTheDocument();
    expect(screen.getByText("8:00 PM – 1:00 AM (next day)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in Google Maps/ })).toHaveAttribute(
      "href",
      expect.stringContaining("query=The%20Grand%20Ballroom%2C%20Rajpur%20Road"),
    );
    expect(screen.getByText("Indo-western")).toBeInTheDocument();
    expect(screen.getByText(/DJ from 9 PM/)).toBeInTheDocument();
  });

  it("edits only what changed and sends the version it was read at", async () => {
    routes[`PATCH ${URL}`] = (body) => data({ ...sangeet, ...(body as object), version: 4 });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: DETAIL.edit }));
    const save = dialog().getByRole("button", { name: EVENTS.form.save });
    expect(save).toBeDisabled();
    fireEvent.change(dialog().getByLabelText("Dress code"), { target: { value: "Pastels" } });
    fireEvent.click(save);

    expect(await screen.findByText("Sangeet saved.")).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      dressCode: "Pastels",
      version: 3,
    });
  });

  it("asks to reload when someone else changed the event first", async () => {
    routes[`PATCH ${URL}`] = () => apiError(409, "CONFLICT");
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: DETAIL.edit }));
    fireEvent.change(dialog().getByLabelText("Venue"), { target: { value: "Lawns" } });
    fireEvent.click(dialog().getByRole("button", { name: EVENTS.form.save }));
    expect(await dialog().findByText(EVENTS.form.conflict.title)).toBeInTheDocument();

    // Reloading brings in the newer version and starts a fresh form.
    routes[`GET ${URL}`] = () => data({ ...sangeet, venueName: "Rooftop", version: 4 });
    fireEvent.click(dialog().getByRole("button", { name: EVENTS.form.conflict.action }));
    expect(await dialog().findByDisplayValue("Rooftop")).toBeInTheDocument();
    expect(dialog().queryByText(EVENTS.form.conflict.title)).not.toBeInTheDocument();
  });

  it("archives after confirming, then returns to the list", async () => {
    routes[`DELETE ${URL}`] = () => ({ status: 200, body: { success: true } });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: DETAIL.archive }));
    expect(screen.getByRole("dialog", { name: "Archive Sangeet?" })).toBeInTheDocument();
    fireEvent.click(dialog().getByRole("button", { name: DETAIL.confirmArchive.confirm }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/events"));
    expect(calls.some((call) => call.method === "DELETE" && call.url === URL)).toBe(true);
  });

  it("keeps archived events read-only", async () => {
    routes[`GET ${URL}`] = () => data({ ...sangeet, archivedAt: "2026-11-01T06:30:00.000Z" });
    renderScreen();

    expect(await screen.findByText(/Archived on 1 November 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: DETAIL.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: DETAIL.archive })).not.toBeInTheDocument();
  });

  it("says when the event cannot be found", async () => {
    routes[`GET ${URL}`] = () => apiError(404, "NOT_FOUND");
    renderScreen();

    expect(await screen.findByText(DETAIL.notFound.title)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: DETAIL.back })[0]).toHaveAttribute(
      "href",
      "/app/events",
    );
  });
});
