import { describe, expect, it } from "vitest";

import {
  coupleDisplayName,
  coupleShortName,
  initialsOf,
  weddingCountdownLabel,
  weddingPlace,
} from "./couple";

describe("coupleDisplayName", () => {
  it("puts the groom first when there is no title", () => {
    expect(coupleDisplayName({ brideName: "Juliet", groomName: "Romeo" })).toBe("Romeo & Juliet");
    expect(coupleDisplayName({ brideName: "Juliet", groomName: "Romeo", title: "  " })).toBe(
      "Romeo & Juliet",
    );
  });

  it("prefers the couple's own title", () => {
    expect(
      coupleDisplayName({ brideName: "Princi", groomName: "Akshay", title: "Akshay ❤️ Princi" }),
    ).toBe("Akshay ❤️ Princi");
  });
});

describe("coupleShortName", () => {
  it("uses first names, groom first, so both fit on a phone (QA M15)", () => {
    expect(
      coupleShortName({
        groomName: "Sai Krishna Chaitanya",
        brideName: " Venkata Lakshmi Priyanka ",
        title: null,
      }),
    ).toBe("Sai & Venkata");
    expect(coupleShortName({ groomName: "Akshay", brideName: "Princi" })).toBe("Akshay & Princi");
  });

  it("keeps the couple's own title", () => {
    expect(coupleShortName({ groomName: "A B", brideName: "C D", title: "Our big day" })).toBe(
      "Our big day",
    );
  });
});

describe("weddingCountdownLabel", () => {
  it.each([
    [127, "127 days to go"],
    [1, "Tomorrow!"],
    [0, "Today!"],
    [-3, "Married"],
  ])("%i → %s", (days, label) => {
    expect(weddingCountdownLabel(days)).toBe(label);
  });
});

describe("weddingPlace", () => {
  it("joins city and state, skipping blanks", () => {
    expect(weddingPlace({ city: "Dehradun", state: "Uttarakhand" })).toBe("Dehradun, Uttarakhand");
    expect(weddingPlace({ city: "Dehradun", state: " " })).toBe("Dehradun");
    expect(weddingPlace({ city: null, state: null })).toBeNull();
  });
});

describe("initialsOf", () => {
  it.each([
    ["Akshay Saini", "AS"],
    ["Akshay Kumar Saini", "AS"],
    ["princi", "P"],
    ["  ", ""],
  ])("%s → %s", (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});
