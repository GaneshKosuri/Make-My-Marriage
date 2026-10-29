// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardDto } from "@/modules/dashboard/dashboard.types";
import type { MemberRole } from "@/modules/members/member.constants";

import { DASHBOARD } from "../dashboard-content";
import { DashboardScreen } from "./dashboard-screen";

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

const wedding = {
  brideName: "Princi",
  groomName: "Akshay",
  title: null,
  weddingDate: "2027-02-14",
  timeZone: "Asia/Kolkata",
  city: "Dehradun",
  state: "Uttarakhand",
};

const emptyDashboard: DashboardDto = {
  countdown: { weddingDate: "2027-02-14", daysRemaining: 42 },
  summary: {
    events: 0,
    tasks: { total: 0, completed: 0 },
    guests: 0,
    rsvps: { pending: 0, attending: 0, notAttending: 0, peopleAttending: 0 },
    invitationsSent: 0,
    members: 1,
    totalExpensePaise: 0,
    vendors: 0,
  },
  upcomingEvents: [],
  upcomingTasks: [],
};

const fullDashboard: DashboardDto = {
  countdown: { weddingDate: "2027-02-14", daysRemaining: 42 },
  summary: {
    events: 6,
    tasks: { total: 48, completed: 32 },
    guests: 186,
    rsvps: { pending: 54, attending: 120, notAttending: 12, peopleAttending: 287 },
    invitationsSent: 132,
    members: 4,
    totalExpensePaise: 124_500_000,
    vendors: 8,
  },
  upcomingEvents: [
    {
      id: "e1",
      name: "Mehendi",
      type: "MEHENDI",
      startsAt: "2027-02-12T10:30:00.000Z",
      endsAt: "2027-02-12T14:30:00.000Z",
      venueName: "Pine View Lawn, Dehradun",
      address: null,
      description: null,
      dressCode: "Pastel & yellow",
      archivedAt: null,
      version: 0,
    },
  ],
  upcomingTasks: [
    {
      id: "t1",
      title: "Finalise photographer",
      description: null,
      priority: "HIGH",
      status: "TODO",
      // Midnight 30 Dec in India.
      dueDate: "2026-12-29T18:30:00.000Z",
      completedAt: null,
      assignee: { membershipId: "m1", name: "Akshay Saini", role: "ADMIN" },
      event: null,
      version: 0,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      id: "t2",
      title: "Confirm Haldi flowers",
      description: null,
      priority: "LOW",
      status: "IN_PROGRESS",
      dueDate: "2027-01-17T18:30:00.000Z",
      completedAt: null,
      assignee: null,
      event: { id: "e2", name: "Haldi", archivedAt: null },
      version: 0,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ],
};

function renderScreen(role: MemberRole = "ADMIN") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardScreen wedding={wedding} role={role} daysRemaining={42} today="2027-01-03" />
    </QueryClientProvider>,
  );
}

const region = (name: string) => within(screen.getByRole("region", { name }));

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("<DashboardScreen />", () => {
  it("shows the couple and countdown straight away, then the numbers", async () => {
    reply(200, { data: fullDashboard });
    renderScreen();

    const hero = region("Your wedding");
    expect(hero.getByRole("heading", { name: "Akshay & Princi" })).toBeInTheDocument();
    expect(hero.getByText("14 February 2027")).toBeInTheDocument();
    expect(hero.getByText("Dehradun, Uttarakhand")).toBeInTheDocument();
    expect(hero.getAllByText("42 days to go").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(DASHBOARD.loading)).toBeInTheDocument();

    const summary = within(await screen.findByRole("region", { name: DASHBOARD.summaryHeading }));
    expect(summary.getByText("₹12,45,000")).toBeInTheDocument();
    expect(summary.getByText("186")).toBeInTheDocument();
    // RSVPs count replies (attending + not attending), with those still to reply.
    expect(summary.getByText("132")).toBeInTheDocument();
    expect(summary.getByText("54 still to reply")).toBeInTheDocument();
    expect(
      summary.getByRole("progressbar", { name: "32 of 48 tasks completed" }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/dashboard");
  });

  it("lists upcoming events and tasks in the wedding's time zone", async () => {
    reply(200, { data: fullDashboard });
    renderScreen();

    const events = within(await screen.findByRole("region", { name: DASHBOARD.events.title }));
    expect(events.getByText("4:00 PM – 8:00 PM")).toBeInTheDocument();
    expect(events.getByText("Pine View Lawn, Dehradun")).toBeInTheDocument();
    expect(events.getByRole("link", { name: /Mehendi/ })).toHaveAttribute("href", "/app/events/e1");

    const tasks = region(DASHBOARD.tasks.title);
    expect(tasks.getByText("Due 30 Dec 2026")).toBeInTheDocument();
    expect(tasks.getAllByText(DASHBOARD.tasks.overdue)).toHaveLength(1);
    expect(tasks.getByText("Akshay Saini")).toBeInTheDocument();
    expect(tasks.getByText("Haldi")).toBeInTheDocument();
    expect(tasks.getByRole("link", { name: DASHBOARD.tasks.mine })).toHaveAttribute(
      "href",
      "/app/tasks?mine=true",
    );

    const rsvp = region(DASHBOARD.rsvp.title);
    expect(rsvp.getByText("287 people attending")).toBeInTheDocument();
    expect(rsvp.getByText("Not attending:")).toBeInTheDocument();
  });

  it("welcomes a new wedding with the checklist and empty states", async () => {
    reply(200, { data: emptyDashboard });
    renderScreen();

    expect(await screen.findByText("Welcome, Akshay & Princi!")).toBeInTheDocument();
    const checklist = region(DASHBOARD.checklist.title);
    expect(checklist.getByText("0 of 5 done")).toBeInTheDocument();
    expect(checklist.getByRole("link", { name: "Add your first event" })).toHaveAttribute(
      "href",
      "/app/events",
    );
    expect(checklist.getByRole("link", { name: "Invite a family member" })).toHaveAttribute(
      "href",
      "/app/settings/members",
    );
    expect(screen.getByText(DASHBOARD.events.empty.title)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD.tasks.empty.title)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD.rsvp.empty.title)).toBeInTheDocument();
    expect(screen.getAllByText(DASHBOARD.nothingYet)).toHaveLength(6);
  });

  it("does not send Managers to the Admin-only members page", async () => {
    reply(200, { data: emptyDashboard });
    renderScreen("MANAGER");

    const checklist = within(
      await screen.findByRole("region", { name: DASHBOARD.checklist.title }),
    );
    expect(checklist.getByText("Invite a family member")).toBeInTheDocument();
    expect(checklist.queryByRole("link", { name: "Invite a family member" })).toBeNull();
    expect(checklist.getByText(DASHBOARD.checklist.steps.member.managerHint)).toBeInTheDocument();
  });

  it("hides the checklist once every step is done", async () => {
    reply(200, { data: fullDashboard });
    renderScreen();
    await screen.findByRole("region", { name: DASHBOARD.summaryHeading });
    expect(screen.queryByRole("region", { name: DASHBOARD.checklist.title })).toBeNull();
    expect(screen.queryByText("Welcome, Akshay & Princi!")).toBeNull();
  });

  it("offers a retry when the numbers cannot load", async () => {
    reply(500, { error: { code: "INTERNAL_ERROR", message: "x" } });
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(DASHBOARD.error.title);
    reply(200, { data: fullDashboard });
    fireEvent.click(screen.getByRole("button", { name: DASHBOARD.error.retry }));
    expect(await screen.findByText("₹12,45,000")).toBeInTheDocument();
  });
});
