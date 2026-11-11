import { describe, expect, it } from "vitest";

import {
  addDays,
  dateOnlyInTimeZone,
  dateOnlyToUtcDate,
  daysUntil,
  formatDateOnly,
  formatInstant,
  isValidDateOnly,
  isValidTimeOfDay,
  isValidTimeZone,
  parseDateOnly,
  timeOfDayInTimeZone,
  utcDateToDateOnly,
  zonedDateTimeToInstant,
} from "./dates";

describe("date-only values (DATABASE_DESIGN §14)", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseDateOnly("2027-02-14")).toEqual({ year: 2027, month: 2, day: 14 });
  });

  it("rejects impossible calendar dates and other formats", () => {
    expect(() => parseDateOnly("2027-02-30")).toThrow(RangeError);
    expect(() => parseDateOnly("2027-2-14")).toThrow(RangeError);
    expect(() => parseDateOnly("14/02/2027")).toThrow(RangeError);
    expect(isValidDateOnly("2028-02-29")).toBe(true); // leap year
    expect(isValidDateOnly("2027-02-29")).toBe(false);
    expect(isValidDateOnly(20270214)).toBe(false);
  });

  it("formats without timezone drift (14 February never becomes 13 February)", () => {
    expect(formatDateOnly("2027-02-14")).toBe("14 February 2027");
    expect(formatDateOnly("2027-01-01")).toBe("1 January 2027");
  });

  it("handles years below 100 (seen while a year is typed digit by digit)", () => {
    expect(isValidDateOnly("0002-02-13")).toBe(true);
    expect(dateOnlyToUtcDate("0020-02-13").getUTCFullYear()).toBe(20);
    expect(utcDateToDateOnly(dateOnlyToUtcDate("0002-02-13"))).toBe("0002-02-13");
    expect(addDays("0099-12-31", 1)).toBe("0100-01-01");
  });

  it("round-trips through UTC midnight", () => {
    const date = dateOnlyToUtcDate("2027-02-14");
    expect(date.toISOString()).toBe("2027-02-14T00:00:00.000Z");
    expect(utcDateToDateOnly(date)).toBe("2027-02-14");
  });
});

describe("instants rendered in the wedding's time zone (DATABASE_DESIGN §15, §33)", () => {
  it("renders a UTC instant in Asia/Kolkata", () => {
    // 14:30 UTC = 20:00 IST
    const formatted = formatInstant("2027-02-14T14:30:00.000Z", "Asia/Kolkata", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
    expect(formatted).toBe("20:00");
  });

  it("finds the calendar date of an instant in a zone", () => {
    const instant = new Date("2027-02-13T20:00:00.000Z"); // 14 Feb 01:30 in India
    expect(dateOnlyInTimeZone(instant, "Asia/Kolkata")).toBe("2027-02-14");
    expect(dateOnlyInTimeZone(instant, "UTC")).toBe("2027-02-13");
  });

  it("validates IANA zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});

describe("daysUntil (dashboard countdown)", () => {
  it("counts calendar days in the wedding's zone", () => {
    const now = new Date("2027-01-03T06:00:00.000Z");
    expect(daysUntil("2027-02-14", "Asia/Kolkata", now)).toBe(42);
  });

  it("is 0 on the day, even when UTC is still on the previous date", () => {
    const now = new Date("2027-02-13T20:00:00.000Z"); // already 14 Feb in India
    expect(daysUntil("2027-02-14", "Asia/Kolkata", now)).toBe(0);
    expect(daysUntil("2027-02-14", "UTC", now)).toBe(1);
  });

  it("goes negative after the date", () => {
    const now = new Date("2027-02-20T06:00:00.000Z");
    expect(daysUntil("2027-02-14", "Asia/Kolkata", now)).toBe(-6);
  });
});

describe("wall-clock times in the wedding's time zone (DATABASE_DESIGN §33)", () => {
  it("converts a local date and time to the UTC instant", () => {
    expect(zonedDateTimeToInstant("2027-02-12", "16:00", "Asia/Kolkata").toISOString()).toBe(
      "2027-02-12T10:30:00.000Z",
    );
    expect(zonedDateTimeToInstant("2027-02-12", "00:15", "Asia/Kolkata").toISOString()).toBe(
      "2027-02-11T18:45:00.000Z",
    );
    expect(zonedDateTimeToInstant("2027-07-01", "18:00", "Europe/London").toISOString()).toBe(
      "2027-07-01T17:00:00.000Z",
    );
    expect(zonedDateTimeToInstant("2027-01-01", "18:00", "America/New_York").toISOString()).toBe(
      "2027-01-01T23:00:00.000Z",
    );
  });

  it("handles daylight-saving changes", () => {
    // London: 01:00–02:00 is skipped on 28 March 2027.
    expect(zonedDateTimeToInstant("2027-03-28", "01:30", "Europe/London").toISOString()).toBe(
      "2027-03-28T01:30:00.000Z",
    );
    expect(zonedDateTimeToInstant("2027-03-28", "03:00", "Europe/London").toISOString()).toBe(
      "2027-03-28T02:00:00.000Z",
    );
  });

  it("reads the wall-clock time back", () => {
    const instant = new Date("2027-02-11T18:45:00.000Z");
    expect(timeOfDayInTimeZone(instant, "Asia/Kolkata")).toBe("00:15");
    expect(dateOnlyInTimeZone(instant, "Asia/Kolkata")).toBe("2027-02-12");
    expect(timeOfDayInTimeZone(instant, "UTC")).toBe("18:45");
  });

  it("rejects malformed times and moves dates by days", () => {
    expect(() => zonedDateTimeToInstant("2027-02-12", "4pm", "Asia/Kolkata")).toThrow(RangeError);
    expect(isValidTimeOfDay("23:59")).toBe(true);
    expect(isValidTimeOfDay("24:00")).toBe(false);
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});
