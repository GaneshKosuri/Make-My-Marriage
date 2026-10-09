import { describe, expect, it } from "vitest";

import {
  FEATURE_AVAILABILITY,
  isComingSoon,
  upcomingFeaturesSentence,
  type FeatureAvailability,
  type ProductFeature,
} from "./feature-availability";

function availability(
  overrides: Partial<Record<ProductFeature, FeatureAvailability>> = {},
  base: FeatureAvailability = "live",
): Record<ProductFeature, FeatureAvailability> {
  const all = Object.fromEntries(
    Object.keys(FEATURE_AVAILABILITY).map((feature) => [feature, base]),
  ) as Record<ProductFeature, FeatureAvailability>;
  return { ...all, ...overrides };
}

describe("feature availability", () => {
  it("marks features coming soon only when configured so", () => {
    const source = availability({ expenses: "coming-soon" });
    expect(isComingSoon("expenses", source)).toBe(true);
    expect(isComingSoon("events", source)).toBe(false);
  });

  it("lists upcoming features as one sentence", () => {
    const source = availability({ vendors: "coming-soon", livestream: "coming-soon" });
    expect(upcomingFeaturesSentence(source)).toBe("My Vendors and a YouTube livestream.");
  });

  it("capitalises the first upcoming feature", () => {
    expect(upcomingFeaturesSentence(availability({ expenses: "coming-soon" }))).toBe(
      "Expense tracking.",
    );
  });

  it("has nothing to announce once every feature is live", () => {
    expect(upcomingFeaturesSentence(availability())).toBeNull();
  });

  it("matches the PRD §16 roadmap today: planning live, later phases coming soon", () => {
    expect(isComingSoon("events")).toBe(false);
    expect(isComingSoon("guests")).toBe(false);
    for (const feature of ["expenses", "vendors", "website", "livestream"] as const) {
      expect(isComingSoon(feature)).toBe(true);
    }
  });
});
