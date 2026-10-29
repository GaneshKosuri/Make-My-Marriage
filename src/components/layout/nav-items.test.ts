import { describe, expect, it } from "vitest";

import { isActiveHref, moreGroups, NAV_ITEMS, navItemsForRole, type NavItem } from "./nav-items";

const flatten = (items: readonly NavItem[]): string[] =>
  items.flatMap((item) => [item.href, ...flatten(item.children ?? [])]);

describe("navItemsForRole (PRD §10, §9.4)", () => {
  it("shows Managers every page, Wedding Members included (read-only there)", () => {
    expect(flatten(navItemsForRole("MANAGER"))).toEqual(flatten(NAV_ITEMS));
    expect(flatten(navItemsForRole("MANAGER"))).toContain("/app/settings/members");
  });

  const withAdminPage: NavItem[] = [
    {
      label: "Settings",
      href: "/s",
      children: [{ label: "Secret", href: "/s/x", adminOnly: true }],
    },
  ];

  it("removes adminOnly items for Managers, at any depth", () => {
    expect(flatten(navItemsForRole("ADMIN", withAdminPage))).toEqual(["/s", "/s/x"]);
    expect(flatten(navItemsForRole("MANAGER", withAdminPage))).toEqual(["/s"]);
  });

  it("does not mutate the configuration it filters", () => {
    navItemsForRole("MANAGER", withAdminPage);
    expect(flatten(withAdminPage)).toContain("/s/x");
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

  it("lists Wedding Members for Managers too", () => {
    expect(labels("MANAGER")).toEqual(labels("ADMIN"));
  });
});
