import { describe, expect, it } from "vitest";

import { baseWeddingSlug, slugifyName, withSuffix } from "./wedding.slug";

describe("wedding slug (SYSTEM_DESIGN §27)", () => {
  it("is groom-bride-ddmmyyyy, lowercase", () => {
    expect(
      baseWeddingSlug({ brideName: "Juliet", groomName: "Romeo", weddingDate: "2027-02-14" }),
    ).toBe("romeo-juliet-14022027");
  });

  it.each([
    ["Juliët", "juliet"],
    ["  Mary  Jane ", "mary-jane"],
    ["D'Souza", "d-souza"],
    ["Ana-Lucía", "ana-lucia"],
    ["प्रिंसी", ""],
  ])("normalises %j to %j", (name, expected) => {
    expect(slugifyName(name)).toBe(expected);
  });

  it("falls back to a generic prefix when no name has Latin letters", () => {
    expect(
      baseWeddingSlug({ brideName: "प्रिंसी", groomName: "अक्षय", weddingDate: "2027-02-14" }),
    ).toBe("wedding-14022027");
    expect(
      baseWeddingSlug({ brideName: "प्रिंसी", groomName: "Akshay", weddingDate: "2027-02-14" }),
    ).toBe("akshay-14022027");
  });

  it("adds -2, -3 … on collision and stays within the length limit", () => {
    expect(withSuffix("romeo-juliet-14022027", 1)).toBe("romeo-juliet-14022027");
    expect(withSuffix("romeo-juliet-14022027", 3)).toBe("romeo-juliet-14022027-3");
    const long = baseWeddingSlug({
      brideName: "a".repeat(80),
      groomName: "b".repeat(80),
      weddingDate: "2027-02-14",
    });
    expect(long.length).toBeLessThanOrEqual(120);
    expect(withSuffix(long, 12).length).toBeLessThanOrEqual(120);
  });
});
