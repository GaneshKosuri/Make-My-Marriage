import { describe, expect, it } from "vitest";

import { createVendorSchema, normaliseWebsite, updateVendorSchema } from "./vendor.schemas";

describe("vendor website", () => {
  it.each([
    ["pixelphotography.in", "https://pixelphotography.in/"],
    ["www.pixel.in/portfolio?x=1", "https://www.pixel.in/portfolio?x=1"],
    ["http://pixel.in", "http://pixel.in/"],
    ["  HTTPS://Pixel.in  ", "https://pixel.in/"],
    ["", ""],
  ])("accepts %s", (input, stored) => {
    expect(normaliseWebsite(input)).toBe(stored);
  });

  // Shown as a link to every member: only web addresses.
  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "ftp://pixel.in",
    "localhost",
    "https://user:pass@pixel.in",
    "not a website",
  ])("refuses %s", (input) => {
    expect(normaliseWebsite(input)).toBeNull();
  });
});

describe("createVendorSchema", () => {
  it("drops duplicate events and defaults to none", () => {
    const id = "6aeb2fe70d805e865a620a08";
    expect(
      createVendorSchema.parse({ name: "Beat Box", category: "DJ", eventIds: [id, id] }).eventIds,
    ).toEqual([id]);
    expect(createVendorSchema.parse({ name: "Beat Box", category: "DJ" }).eventIds).toEqual([]);
  });

  it("takes the agreed cost as whole paise, ₹0 included", () => {
    expect(
      createVendorSchema.safeParse({ name: "Beat Box", category: "DJ", totalAgreedCostPaise: 0 })
        .success,
    ).toBe(true);
    expect(
      createVendorSchema.safeParse({ name: "Beat Box", category: "DJ", totalAgreedCostPaise: 1.5 })
        .success,
    ).toBe(false);
  });
});

describe("updateVendorSchema", () => {
  it("needs a field besides the version", () => {
    expect(updateVendorSchema.safeParse({ version: 2 }).success).toBe(false);
    expect(updateVendorSchema.safeParse({ notes: "", version: 2 }).success).toBe(true);
  });
});
