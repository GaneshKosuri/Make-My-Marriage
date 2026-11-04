import { describe, expect, it } from "vitest";

import { eventSchedule, mapsSearchUrl } from "./format";

const TZ = "Asia/Kolkata";

describe("eventSchedule", () => {
  it("shows the start day and the time range in the wedding's time zone", () => {
    expect(
      eventSchedule({ startsAt: "2027-02-12T10:30:00Z", endsAt: "2027-02-12T14:30:00Z" }, TZ),
    ).toEqual({ date: "Friday, 12 February 2027", time: "4:00 PM – 8:00 PM" });
    expect(eventSchedule({ startsAt: "2027-02-12T10:30:00Z", endsAt: null }, TZ).time).toBe(
      "4:00 PM",
    );
  });

  it("marks an end after midnight as the next day", () => {
    expect(
      eventSchedule({ startsAt: "2027-02-12T14:30:00Z", endsAt: "2027-02-12T19:30:00Z" }, TZ),
    ).toEqual({ date: "Friday, 12 February 2027", time: "8:00 PM – 1:00 AM (next day)" });
  });

  it("names the end date when it is later than the next day", () => {
    expect(
      eventSchedule({ startsAt: "2027-02-12T10:30:00Z", endsAt: "2027-02-14T06:30:00Z" }, TZ).time,
    ).toBe("4:00 PM – 14 Feb, 12:00 PM");
  });
});

describe("mapsSearchUrl", () => {
  it("searches for the venue and address", () => {
    expect(mapsSearchUrl({ venueName: "Royal Garden", address: "Rajpur Road, Dehradun" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Royal%20Garden%2C%20Rajpur%20Road%2C%20Dehradun",
    );
    expect(mapsSearchUrl({ venueName: null, address: null })).toBeNull();
  });
});
