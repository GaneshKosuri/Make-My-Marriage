import { describe, expect, it } from "vitest";

import { eventDateTile, eventTimeRange, formatShortDate, isOverdue, taskDueDay } from "./format";

const IST = "Asia/Kolkata";

describe("eventTimeRange", () => {
  it("shows start and end in the wedding's time zone", () => {
    // 10:30–14:30 UTC is 4:00 PM – 8:00 PM in India.
    expect(
      eventTimeRange({ startsAt: "2027-02-12T10:30:00Z", endsAt: "2027-02-12T14:30:00Z" }, IST),
    ).toBe("4:00 PM – 8:00 PM");
    expect(eventTimeRange({ startsAt: "2027-02-12T10:30:00Z", endsAt: null }, IST)).toBe("4:00 PM");
  });
});

describe("eventDateTile", () => {
  it("uses the wedding-local day, not UTC", () => {
    // 20:00 UTC on 12 Feb is already 13 Feb in India.
    expect(eventDateTile("2027-02-12T20:00:00Z", IST)).toEqual({
      day: "13",
      month: "Feb",
      year: "2027",
      label: "Saturday, 13 February 2027",
    });
  });
});

describe("task due dates", () => {
  // Midnight 30 Dec in India, stored as a UTC instant.
  const dueDate = "2026-12-29T18:30:00.000Z";

  it("reads the due day in the wedding's time zone", () => {
    expect(taskDueDay(dueDate, IST)).toBe("2026-12-30");
    expect(formatShortDate("2026-12-30")).toBe("30 Dec 2026");
  });

  it("is overdue only when incomplete and due before today", () => {
    expect(isOverdue({ status: "TODO", dueDate }, "2026-12-31", IST)).toBe(true);
    expect(isOverdue({ status: "TODO", dueDate }, "2026-12-30", IST)).toBe(false);
    expect(isOverdue({ status: "COMPLETED", dueDate }, "2027-01-03", IST)).toBe(false);
    expect(isOverdue({ status: "IN_PROGRESS", dueDate: null }, "2027-01-03", IST)).toBe(false);
  });
});
