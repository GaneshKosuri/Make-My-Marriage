import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createWeddingSchema } from "./wedding.schemas";

const valid = {
  brideName: "Juliet",
  groomName: "Romeo",
  weddingDate: "2027-02-14",
  location: { city: "Dehradun" },
};

const messages = (input: unknown) =>
  createWeddingSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("createWeddingSchema (API_DESIGN §17, PRD §9.2)", () => {
  it("accepts the required fields and defaults the time zone to India", () => {
    expect(createWeddingSchema.parse(valid)).toEqual({ ...valid, timeZone: "Asia/Kolkata" });
  });

  it("requires names, a date and the city", () => {
    expect(
      messages({ brideName: " ", groomName: "", weddingDate: "", location: { city: "" } }),
    ).toEqual([
      "Enter the bride's name",
      "Enter the groom's name",
      "Choose the wedding date",
      "Enter the city",
    ]);
  });

  it("rejects impossible dates and past dates", () => {
    expect(messages({ ...valid, weddingDate: "2027-02-30" })).toEqual(["Choose a valid date"]);
    expect(messages({ ...valid, weddingDate: "2026-10-09" })).toEqual([
      "Choose today or a later date",
    ]);
    expect(createWeddingSchema.safeParse({ ...valid, weddingDate: "2026-10-10" }).success).toBe(
      true,
    );
  });

  it("judges 'today' in the wedding's time zone", () => {
    // 23:30 UTC on 10 Oct is already 11 Oct in India, but still 10 Oct in New York.
    vi.setSystemTime(new Date("2026-10-10T23:30:00Z"));
    expect(messages({ ...valid, weddingDate: "2026-10-10" })).toEqual([
      "Choose today or a later date",
    ]);
    expect(
      createWeddingSchema.safeParse({
        ...valid,
        weddingDate: "2026-10-10",
        timeZone: "America/New_York",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown time zones and unknown fields such as weddingId", () => {
    expect(messages({ ...valid, timeZone: "Mars/Olympus" })).toContain("Choose a valid time zone");
    expect(createWeddingSchema.safeParse({ ...valid, weddingId: "x" }).success).toBe(false);
    expect(
      createWeddingSchema.safeParse({ ...valid, location: { city: "Goa", venue: "x" } }).success,
    ).toBe(false);
  });
});
