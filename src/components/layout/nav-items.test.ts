import { describe, expect, it } from "vitest";

import { isActiveHref, moreGroups, NAV_ITEMS, navItemsForRole, type NavItem } from "./nav-items";

const flatten = (items: readonly NavItem[]): string[] =>
  items.flatMap((item) => [item.href, ...flatten(item.children ?? [])]);

describe("navItemsForRole (PRD §10, §9.4)", () => {
  it("shows Wedding Members to Admins only", () => {
    expect(flatten(navItemsForRole("ADMIN"))).toContain("/app/settings/members");
    expect(flatten(navItemsForRole("MANAGER"))).not.toContain("/app/settings/members");
  });

  it("keeps every other destination for Managers", () => {
    const all = flatten(NAV_ITEMS).filter((href) => href !== "/app/settings/members");
    expect(new Set(flatten(navItemsForRole("MANAGER")))).toEqual(new Set(all));
  });

  it("does not mutate the shared configuration", () => {
    navItemsForRole("MANAGER");
    expect(flatten(NAV_ITEMS)).toContain("/app/settings/members");
  });
});

describe("isActiveHref", () => {
  it("matches the dashboard root exactly and sections by prefix", () => {
    expect(isActiveHref("/app", "/app")).toBe(true);
    expect(isActiveHref("/app/events", "/app")).toBe(false);
    expect(isActiveHref("/app/guests/rsvp", "/app/guests")).toBe(true);
    expect(isActiveHref("/app/guestsxyz", "/app/guests")).toBe(false);
  });
});

describe("moreGroups (mobile More sheet)", () => {
  const labels = (role: "ADMIN" | "MANAGER") =>
    moreGroups(navItemsForRole(role)).map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ]);

  it("lists every page outside the bottom bar, sub-pages by their own label", () => {
    expect(labels("ADMIN")).toEqual([
      ["Plan", ["Expenses", "My Vendors", "Discover Vendors"]],
      ["Share & memories", ["Wedding Website", "Gallery", "QR Code", "Live Stream"]],
      ["Settings", ["Wedding Details", "Wedding Members"]],
    ]);
  });

  it("leaves out Wedding Members for Managers", () => {
    expect(labels("MANAGER").at(-1)).toEqual(["Settings", ["Wedding Details"]]);
  });
});
