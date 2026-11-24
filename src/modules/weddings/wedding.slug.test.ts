import { describe, expect, it } from "vitest";

import { WEDDING_SLUG_PATTERN } from "./wedding.constants";
import { baseWeddingSlug, randomSlugSuffix, slugifyName, withSuffix } from "./wedding.slug";

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

  it("ends with a random suffix and stays within the length limit (QA D2)", () => {
    expect(withSuffix("romeo-juliet-14022027", "k7f3")).toBe("romeo-juliet-14022027-k7f3");
    const long = baseWeddingSlug({
      brideName: "a".repeat(80),
      groomName: "b".repeat(80),
      weddingDate: "2027-02-14",
    });
    expect(long.length).toBeLessThanOrEqual(120);
    const suffixed = withSuffix(long, "k7f3k7f3");
    expect(suffixed.length).toBeLessThanOrEqual(120);
    expect(suffixed).toMatch(WEDDING_SLUG_PATTERN);
  });

  it("draws lowercase letters and digits, differently each time", () => {
    const drawn = new Set(Array.from({ length: 50 }, () => randomSlugSuffix()));
    for (const suffix of drawn) expect(suffix).toMatch(/^[a-z0-9]{4}$/);
    expect(drawn.size).toBeGreaterThan(45);
    expect(randomSlugSuffix(8)).toMatch(/^[a-z0-9]{8}$/);
  });
});
