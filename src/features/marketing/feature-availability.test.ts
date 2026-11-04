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

  it("matches what is built today: family members and events are live", () => {
    expect(isComingSoon("familyMembers")).toBe(false);
    expect(isComingSoon("events")).toBe(false);
    for (const feature of [
      "tasks",
      "guests",
      "organiserGallery",
      "expenses",
      "vendors",
      "website",
      "livestream",
    ] as const) {
      expect(isComingSoon(feature)).toBe(true);
    }
  });
});
