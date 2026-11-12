// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicInvitationDto } from "@/modules/guests/guest.types";

import { INVITATION } from "../invitation-content";
import { InvitationScreen } from "./invitation-screen";

const TOKEN = "a".repeat(43);
const RSVP_URL = `POST /api/public/invitations/${TOKEN}/rsvp`;

const invitation = (guest: Partial<PublicInvitationDto["guest"]> = {}): PublicInvitationDto => ({
  guest: {
    name: "Rajesh Sharma",
    maxGuests: 4,
    rsvpStatus: "PENDING",
    attendingCount: null,
    ...guest,
  },
  wedding: {
    brideName: "Princi",
    groomName: "Akshay",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
    title: null,
    location: "Dehradun, Uttarakhand",
  },
  events: [
    {
      name: "Sangeet",
      startsAt: "2027-02-12T14:30:00.000Z",
      endsAt: "2027-02-12T19:30:00.000Z",
      venueName: "XYZ Resort",
      address: "Rajpur Road, Dehradun",
      dressCode: "Festive",
      description: null,
    },
  ],
});

type Reply = { status: number; body: unknown };
let replies: Record<string, (body: unknown) => Reply>;
const calls: { method: string; url: string; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, url, body });
  const handler = replies[`${method} ${url}`];
  const result = handler
    ? handler(body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

function renderScreen(initial: PublicInvitationDto) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InvitationScreen token={TOKEN} initial={initial} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replies = {
    [`GET /api/public/invitations/${TOKEN}`]: () => ({ status: 200, body: { data: invitation() } }),
  };
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<InvitationScreen />", () => {
  it("welcomes the guest by name and shows their events in the wedding's time zone", () => {
    renderScreen(invitation());
    expect(screen.getByRole("heading", { level: 1, name: "Akshay & Princi" })).toBeInTheDocument();
    expect(screen.getByText("Sunday, 14 February 2027")).toBeInTheDocument();
    expect(screen.getByText(INVITATION.dear("Rajesh Sharma"))).toBeInTheDocument();
    expect(screen.getByText(INVITATION.partySize(4))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sangeet" })).toBeInTheDocument();
    expect(screen.getByText("Friday, 12 February 2027")).toBeInTheDocument();
    // Plain spaces (no narrow no-break space), so server and browser render the same text.
    expect(screen.getByText("8:00 PM – 1:00 AM (next day)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: INVITATION.events.maps })).toHaveAttribute(
      "href",
      expect.stringContaining("XYZ%20Resort"),
    );
  });

  it("sends yes with a head-count for the whole party, then thanks the guest", async () => {
    replies[RSVP_URL] = () => ({
      status: 200,
      body: { data: { status: "ATTENDING", attendingCount: 3, updatedAt: "2026-11-12T10:00:00Z" } },
    });
    renderScreen(invitation());

    fireEvent.click(screen.getByLabelText(INVITATION.rsvp.yes));
    // Up to the party size, and no more.
    expect(screen.getByLabelText("4")).toBeInTheDocument();
    expect(screen.queryByLabelText("5")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.send }));

    expect(await screen.findByText(INVITATION.rsvp.thanks)).toBeInTheDocument();
    expect(screen.getByText(INVITATION.rsvp.coming(3))).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      status: "ATTENDING",
      attendingCount: 3,
    });
  });

  it("sends no with nobody attending", async () => {
    replies[RSVP_URL] = () => ({
      status: 200,
      body: {
        data: { status: "NOT_ATTENDING", attendingCount: 0, updatedAt: "2026-11-12T10:00:00Z" },
      },
    });
    renderScreen(invitation());
    fireEvent.click(screen.getByLabelText(INVITATION.rsvp.no));
    expect(screen.queryByText(INVITATION.rsvp.countQuestion)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.send }));
    expect(await screen.findByText(INVITATION.rsvp.notComing)).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      status: "NOT_ATTENDING",
      attendingCount: 0,
    });
  });

  it("asks for yes or no before sending", () => {
    renderScreen(invitation());
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.send }));
    expect(screen.getByRole("alert")).toHaveTextContent(INVITATION.rsvp.chooseAttending);
    expect(calls).toHaveLength(0);
  });

  it("shows a saved reply and lets the guest change it", () => {
    renderScreen(invitation({ rsvpStatus: "ATTENDING", attendingCount: 2 }));
    expect(screen.getByText(INVITATION.rsvp.coming(2))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.change }));
    expect(screen.getByLabelText(INVITATION.rsvp.yes)).toBeChecked();
    expect(screen.getByLabelText("2")).toBeChecked();
    expect(screen.getByRole("button", { name: INVITATION.rsvp.update })).toBeInTheDocument();
  });

  it("keeps the draft and reloads the invitation when the party size changed", async () => {
    replies[RSVP_URL] = () => ({
      status: 400,
      body: { error: { code: "PARTY_SIZE_CHANGED", message: "x" } },
    });
    replies[`GET /api/public/invitations/${TOKEN}`] = () => ({
      status: 200,
      body: { data: invitation({ maxGuests: 2 }) },
    });
    renderScreen(invitation());

    fireEvent.click(screen.getByLabelText(INVITATION.rsvp.yes));
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.send }));

    expect(await screen.findByRole("alert")).toHaveTextContent(INVITATION.rsvp.errors.partySize);
    await waitFor(() => expect(screen.queryByLabelText("4")).not.toBeInTheDocument());
    // The answer stays, now within the new party size.
    expect(screen.getByLabelText(INVITATION.rsvp.yes)).toBeChecked();
    expect(screen.getByLabelText("2")).toBeChecked();
  });

  it("explains a reply refused for too many changes", async () => {
    replies[RSVP_URL] = () => ({
      status: 429,
      body: { error: { code: "RATE_LIMITED", message: "x" } },
    });
    renderScreen(invitation());
    fireEvent.click(screen.getByLabelText(INVITATION.rsvp.no));
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.send }));
    expect(await screen.findByRole("alert")).toHaveTextContent(INVITATION.rsvp.errors.rateLimited);
  });

  it("uses a stepper instead of one button per person for large parties", () => {
    renderScreen(invitation({ maxGuests: 25 }));
    fireEvent.click(screen.getByLabelText(INVITATION.rsvp.yes));
    fireEvent.click(screen.getByRole("button", { name: INVITATION.rsvp.increase }));
    expect(screen.getByRole("status", { name: INVITATION.rsvp.countQuestion })).toHaveTextContent(
      "2",
    );
  });
});
