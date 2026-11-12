// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";
import type { GuestDto, RsvpSummaryDto } from "@/modules/guests/guest.types";

import { GUESTS } from "../guests-content";
import { GuestDetailScreen } from "./guest-detail-screen";
import { GuestsScreen } from "./guests-screen";
import { RsvpScreen } from "./rsvp-screen";

/** The address's query string, as `useSearchParams` reports it. */
let search = "";
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push }),
  usePathname: () => "/app/guests",
  useSearchParams: () => new URLSearchParams(search),
}));

const HALDI = "6aeb2fe70d805e865a620a01";
const ROKA = "6aeb2fe70d805e865a620a09";

const event = (id: string, name: string, extra: Partial<EventDto> = {}): EventDto => ({
  id,
  name,
  type: null,
  startsAt: "2027-02-13T03:30:00.000Z",
  endsAt: null,
  venueName: null,
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 0,
  ...extra,
});
const haldi = event(HALDI, "Haldi");

const guest = (id: string, name: string, extra: Partial<GuestDto> = {}): GuestDto => ({
  id,
  name,
  email: null,
  phone: null,
  maxGuests: 1,
  invitedEvents: [],
  notes: null,
  rsvpStatus: "PENDING",
  attendingCount: null,
  rsvpUpdatedAt: null,
  invitationSentAt: null,
  lastReminderSentAt: null,
  reminderCount: 0,
  version: 0,
  createdAt: "2026-11-12T00:00:00.000Z",
  updatedAt: "2026-11-12T00:00:00.000Z",
  ...extra,
});

const rajesh = guest("6aeb2fe70d805e865a620aa1", "Rajesh Sharma", {
  email: "raj@example.com",
  maxGuests: 4,
  rsvpStatus: "ATTENDING",
  attendingCount: 3,
  rsvpUpdatedAt: "2026-11-10T10:30:00.000Z",
  version: 2,
  invitedEvents: [
    { id: HALDI, name: "Haldi", startsAt: haldi.startsAt, archivedAt: null },
    {
      id: ROKA,
      name: "Roka",
      startsAt: "2026-10-01T12:00:00.000Z",
      archivedAt: "2026-10-30T00:00:00.000Z",
    },
  ],
});
const meera = guest("6aeb2fe70d805e865a620aa2", "Meera");

const summary: RsvpSummaryDto = {
  totalGuests: 2,
  pendingInvitations: 1,
  attendingInvitations: 1,
  notAttendingInvitations: 0,
  totalPeopleAttending: 3,
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
const page = (items: GuestDto[]) => ({
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
const LIST = "GET /api/guests?page=1&limit=20";

function renderWithClient(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

const dialog = () => within(screen.getByRole("dialog"));
const list = () => within(screen.getByRole("region", { name: GUESTS.title }));

beforeEach(() => {
  routes = {
    [LIST]: () => page([meera, rajesh]),
    "GET /api/guests/rsvp-summary": () => data(summary),
    "GET /api/events?includeArchived=false": () => data([haldi]),
    "GET /api/events?includeArchived=true": () =>
      data([haldi, event(ROKA, "Roka", { archivedAt: "2026-10-30T00:00:00.000Z" })]),
  };
  calls.length = 0;
  search = "";
  push.mockReset();
  window.history.replaceState(null, "", "/app/guests");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<GuestsScreen />", () => {
  it("lists guests with party size, reply and invited events", async () => {
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);

    expect(
      await screen.findByRole("link", { name: GUESTS.open("Rajesh Sharma") }, { timeout: 5000 }),
    ).toHaveAttribute("href", `/app/guests/${rajesh.id}`);
    expect(list().getByText("Attending · 3")).toBeInTheDocument();
    expect(list().getByText("Awaiting reply")).toBeInTheDocument();
    expect(list().getByText("Up to 4")).toBeInTheDocument();
    expect(list().getByText("Roka (archived)")).toBeInTheDocument();
    expect(list().getByText(GUESTS.noEvents)).toBeInTheDocument();
    expect(list().getByText("1–2 of 2")).toBeInTheDocument();
    // The summary separates invitations from people coming.
    const strip = within(screen.getByRole("region", { name: GUESTS.summary.label }));
    expect(strip.getByText(GUESTS.summary.attending).nextSibling).toHaveTextContent("3");
  });

  it("searches after typing stops and keeps the search and filters in the address", async () => {
    routes["GET /api/guests?page=1&limit=20&search=sharma"] = () => page([rajesh]);
    routes["GET /api/guests?page=1&limit=20&search=sharma&invitationSent=false"] = () => page([]);
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);
    await screen.findByRole("link", { name: GUESTS.open("Meera") }, { timeout: 5000 });

    fireEvent.change(screen.getByRole("searchbox", { name: GUESTS.search.label }), {
      target: { value: " sharma" },
    });
    await waitFor(() => expect(list().queryByText("Meera")).not.toBeInTheDocument());
    expect(window.location.search).toBe("?search=sharma");

    fireEvent.change(screen.getByLabelText(GUESTS.filters.invitation), {
      target: { value: "false" },
    });
    expect(await screen.findByText(GUESTS.noMatches.title)).toBeInTheDocument();
    expect(window.location.search).toBe("?search=sharma&invitationSent=false");

    fireEvent.click(screen.getAllByRole("button", { name: GUESTS.filters.clear })[0]!);
    await screen.findByRole("link", { name: GUESTS.open("Meera") });
    expect(window.location.search).toBe("");
  });

  it("adds a guest with a party size and events, then confirms", async () => {
    routes["POST /api/guests"] = (body) =>
      data({ ...guest("6aeb2fe70d805e865a620aa3", "The Sharma family"), ...(body as object) });
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);
    await screen.findByRole("link", { name: GUESTS.open("Meera") }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: GUESTS.add }));
    const name = await dialog().findByLabelText(GUESTS.form.fields.name.label);
    fireEvent.change(name, { target: { value: "The Sharma family" } });
    const increase = dialog().getByRole("button", { name: GUESTS.form.fields.maxGuests.increase });
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(increase);
    fireEvent.click(dialog().getByRole("checkbox", { name: /Haldi/ }));
    fireEvent.click(dialog().getByRole("button", { name: GUESTS.form.save }));

    expect(await screen.findByText(GUESTS.form.added("The Sharma family"))).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      name: "The Sharma family",
      email: null,
      phone: null,
      maxGuests: 4,
      invitedEventIds: [HALDI],
      notes: null,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the add form from ?new=1 and drops the flag", async () => {
    search = "new=1";
    window.history.replaceState(null, "", "/app/guests?new=1");
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);
    expect(
      await screen.findByRole("dialog", { name: GUESTS.form.addTitle }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("edits only what changed and shows the server's party-size problem on its field", async () => {
    routes[`PATCH /api/guests/${rajesh.id}`] = () =>
      failure(400, "VALIDATION_ERROR", {
        maxGuests: "They said 3 people are coming. Allow at least 3.",
      });
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);

    fireEvent.click(
      await screen.findByRole("button", { name: GUESTS.edit("Rajesh Sharma") }, { timeout: 5000 }),
    );
    const size = await dialog().findByLabelText(GUESTS.form.fields.maxGuests.label);
    expect(size).toHaveValue("4");
    fireEvent.change(size, { target: { value: "2" } });
    // The archived event it already has stays listed and ticked.
    expect(dialog().getByRole("checkbox", { name: /Roka \(archived\)/ })).toBeChecked();
    fireEvent.click(dialog().getByRole("button", { name: GUESTS.form.save }));

    expect(
      await dialog().findByText("They said 3 people are coming. Allow at least 3."),
    ).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      maxGuests: 2,
      version: 2,
    });
  });

  it("offers to reload a guest that changed meanwhile", async () => {
    routes[`PATCH /api/guests/${meera.id}`] = () => failure(409, "CONFLICT");
    routes[`GET /api/guests/${meera.id}`] = () =>
      data({ ...meera, name: "Meera Iyer", version: 1 });
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);

    fireEvent.click(
      await screen.findByRole("button", { name: GUESTS.edit("Meera") }, { timeout: 5000 }),
    );
    fireEvent.change(await dialog().findByLabelText(GUESTS.form.fields.name.label), {
      target: { value: "Meera R" },
    });
    fireEvent.click(dialog().getByRole("button", { name: GUESTS.form.save }));
    fireEvent.click(await dialog().findByRole("button", { name: GUESTS.form.conflict.action }));
    await waitFor(() =>
      expect(dialog().getByLabelText(GUESTS.form.fields.name.label)).toHaveValue("Meera Iyer"),
    );
  });

  it("deletes a guest from the form after asking", async () => {
    routes[`DELETE /api/guests/${meera.id}`] = () => ({ status: 200, body: { success: true } });
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);

    fireEvent.click(
      await screen.findByRole("button", { name: GUESTS.edit("Meera") }, { timeout: 5000 }),
    );
    fireEvent.click(await dialog().findByRole("button", { name: GUESTS.form.delete }));
    fireEvent.click(dialog().getByRole("button", { name: GUESTS.form.confirmDelete.confirm }));
    expect(await screen.findByText(GUESTS.form.deleted("Meera"))).toBeInTheDocument();
    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
  });

  it("invites the first guest when the list is empty", async () => {
    routes[LIST] = () => page([]);
    routes["GET /api/guests/rsvp-summary"] = () => data({ ...summary, totalGuests: 0 });
    renderWithClient(<GuestsScreen timeZone="Asia/Kolkata" />);
    expect(
      await screen.findByRole("button", { name: GUESTS.empty.action }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: GUESTS.summary.label })).not.toBeInTheDocument();
  });
});

describe("<GuestDetailScreen />", () => {
  it("shows the reply, events and contacts, and deletes after confirming", async () => {
    routes[`GET /api/guests/${rajesh.id}`] = () => data(rajesh);
    routes[`DELETE /api/guests/${rajesh.id}`] = () => ({ status: 200, body: { success: true } });
    renderWithClient(
      <GuestDetailScreen
        guestId={rajesh.id}
        timeZone="Asia/Kolkata"
        coupleName="Akshay & Princi"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Rajesh Sharma" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Attending · 3")).toBeInTheDocument();
    expect(screen.getByText(GUESTS.detail.partySize(4))).toBeInTheDocument();
    expect(screen.getByText("Replied 10 Nov 2026, 4:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "raj@example.com" })).toHaveAttribute(
      "href",
      "mailto:raj@example.com",
    );
    expect(screen.getByRole("link", { name: "Haldi" })).toHaveAttribute(
      "href",
      `/app/events/${HALDI}`,
    );
    expect(screen.getByText(GUESTS.detail.notSent)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: GUESTS.detail.delete }));
    fireEvent.click(
      await dialog().findByRole("button", { name: GUESTS.detail.confirmDelete.confirm }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/guests"));
  });

  it("shares the guest's link on WhatsApp, or copies it", async () => {
    const url = `http://localhost:3000/invite/${"t".repeat(43)}`;
    routes[`GET /api/guests/${meera.id}`] = () => data(meera);
    routes[`GET /api/guests/${meera.id}/invitation-link`] = () => data({ url });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderWithClient(
      <GuestDetailScreen guestId={meera.id} timeZone="Asia/Kolkata" coupleName="Akshay & Princi" />,
    );

    const whatsApp = await screen.findByRole(
      "link",
      { name: GUESTS.share.whatsApp },
      { timeout: 5000 },
    );
    const message = decodeURIComponent(whatsApp.getAttribute("href")!.split("text=")[1]!);
    expect(message).toContain("Dear Meera,");
    expect(message).toContain("Akshay & Princi would love for you to celebrate");
    expect(message).toContain(url);
    expect(screen.getByRole("link", { name: GUESTS.share.open })).toHaveAttribute("href", url);

    fireEvent.click(screen.getByRole("button", { name: GUESTS.share.copy }));
    expect(await screen.findByRole("button", { name: GUESTS.share.copied })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it("shows the link to copy by hand when the clipboard is unavailable", async () => {
    const url = `http://localhost:3000/invite/${"t".repeat(43)}`;
    routes[`GET /api/guests/${meera.id}`] = () => data(meera);
    routes[`GET /api/guests/${meera.id}/invitation-link`] = () => data({ url });
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderWithClient(
      <GuestDetailScreen guestId={meera.id} timeZone="Asia/Kolkata" coupleName="Akshay & Princi" />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: GUESTS.share.copy }, { timeout: 5000 }),
    );
    expect(await screen.findByLabelText(GUESTS.share.copyByHand)).toHaveValue(url);
  });

  it("explains a guest that doesn't exist", async () => {
    routes[`GET /api/guests/${meera.id}`] = () => failure(404, "NOT_FOUND");
    renderWithClient(
      <GuestDetailScreen guestId={meera.id} timeZone="Asia/Kolkata" coupleName="Akshay & Princi" />,
    );
    expect(
      await screen.findByText(GUESTS.detail.notFound.title, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});

describe("<RsvpScreen />", () => {
  it("leads with people coming, then lists guests by reply", async () => {
    routes["GET /api/guests?rsvpStatus=PENDING&page=1&limit=20"] = () => page([meera]);
    routes["GET /api/guests?rsvpStatus=ATTENDING&page=1&limit=20"] = () => page([rajesh]);
    renderWithClient(<RsvpScreen />);

    const stats = within(
      await screen.findByRole("region", { name: GUESTS.rsvp.title }, { timeout: 5000 }),
    );
    expect(stats.getByText(GUESTS.rsvp.stats.peopleComing).nextSibling).toHaveTextContent("3");
    expect(stats.getByText("2 invitations")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: GUESTS.open("Meera") })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Attending" }));
    expect(
      await screen.findByRole("link", { name: GUESTS.open("Rajesh Sharma") }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?status=ATTENDING");
  });
});
