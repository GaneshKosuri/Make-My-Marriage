import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/server/auth";

/**
 * dashboardService composes other modules' public APIs. Counting, archived
 * exclusion, paise totals, ordering and tenant scoping run against MongoDB in
 * tests/integration/dashboard.test.ts; this file covers the countdown.
 */

const findIdentityWedding = vi.fn();
vi.mock("@/modules/weddings", () => ({ weddingsService: { findIdentityWedding } }));
vi.mock("@/modules/events", () => ({
  eventsService: { countActive: async () => 0, listUpcoming: async () => [] },
}));
vi.mock("@/modules/tasks", () => ({
  tasksService: {
    countForDashboard: async () => ({ total: 0, completed: 0 }),
    listUpcoming: async () => [],
  },
}));
vi.mock("@/modules/guests", () => ({
  guestsService: {
    countForDashboard: async () => ({
      guests: 0,
      rsvps: { pending: 0, attending: 0, notAttending: 0, peopleAttending: 0 },
      invitationsSent: 0,
    }),
  },
}));
vi.mock("@/modules/members", () => ({ membersService: { countMembers: async () => 1 } }));
vi.mock("@/modules/expenses", () => ({ expensesService: { totalForDashboard: async () => 0 } }));
vi.mock("@/modules/vendors", () => ({ vendorsService: { countForDashboard: async () => 0 } }));

const { dashboardService } = await import("./dashboard.service");

const ctx: MemberContext = {
  requestId: "r1",
  userId: "u1",
  membershipId: "m1",
  weddingId: "65abc00000000000000000a1",
  role: "ADMIN",
};
const wedding = (timeZone: string) => ({
  id: ctx.weddingId,
  brideName: "Princi",
  groomName: "Akshay",
  title: null,
  weddingDate: "2027-02-14",
  timeZone,
  city: null,
  state: null,
});

beforeEach(() => findIdentityWedding.mockReset());

describe("dashboardService.getDashboard", () => {
  it("counts the days to the wedding in the wedding's time zone", async () => {
    // 3 Jan 2027, 20:00 UTC: already 4 January in India, still 3 January in New York.
    const now = new Date("2027-01-03T20:00:00Z");

    findIdentityWedding.mockResolvedValue(wedding("Asia/Kolkata"));
    const india = await dashboardService.getDashboard(ctx, now);
    expect(india.countdown).toEqual({ weddingDate: "2027-02-14", daysRemaining: 41 });

    findIdentityWedding.mockResolvedValue(wedding("America/New_York"));
    const newYork = await dashboardService.getDashboard(ctx, now);
    expect(newYork.countdown.daysRemaining).toBe(42);
  });

  it("is NOT_FOUND when the wedding has been deleted", async () => {
    findIdentityWedding.mockResolvedValue(null);
    await expect(dashboardService.getDashboard(ctx)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
