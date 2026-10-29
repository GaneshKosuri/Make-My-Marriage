import type { MemberRole } from "@/modules/members/member.constants";

/**
 * Dashboard navigation (PRD §10). `adminOnly` items are removed on the server
 * before rendering, so Managers never receive them; the API enforces the same
 * rule independently (`auth: "admin"`).
 */
export interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/app" },
  { label: "Events", href: "/app/events" },
  { label: "Tasks", href: "/app/tasks" },
  {
    label: "Guests",
    href: "/app/guests",
    children: [
      { label: "Guest List", href: "/app/guests" },
      { label: "RSVP", href: "/app/guests/rsvp" },
    ],
  },
  { label: "Expenses", href: "/app/expenses" },
  {
    label: "Vendors",
    href: "/app/vendors",
    children: [
      { label: "My Vendors", href: "/app/vendors" },
      { label: "Discover Vendors", href: "/app/vendors/discover" },
    ],
  },
  { label: "Wedding Website", href: "/app/website" },
  {
    label: "Photos",
    href: "/app/photos",
    children: [
      { label: "Gallery", href: "/app/photos" },
      { label: "QR Code", href: "/app/photos/qr" },
    ],
  },
  { label: "Live Stream", href: "/app/livestream" },
  {
    label: "Settings",
    href: "/app/settings",
    children: [
      { label: "Wedding Details", href: "/app/settings" },
      // Managers see the list read-only; only Admins get the controls (decided 2026-10-29).
      { label: "Wedding Members", href: "/app/settings/members" },
    ],
  },
];

/** Primary destinations for the mobile bottom bar; everything else is in the "More" sheet. */
export const MOBILE_PRIMARY_HREFS = ["/app", "/app/events", "/app/guests", "/app/tasks"] as const;

/** How the "More" sheet groups the remaining pages (Stitch "Mobile More Sheet"). */
export const MOBILE_MORE_GROUPS = [
  { label: "Plan", hrefs: ["/app/expenses", "/app/vendors", "/app/vendors/discover"] },
  {
    label: "Share & memories",
    hrefs: ["/app/website", "/app/photos", "/app/photos/qr", "/app/livestream"],
  },
  { label: "Settings", hrefs: ["/app/settings", "/app/settings/members"] },
] as const;

/**
 * The "More" sheet's groups from role-filtered items. Sub-pages are listed by
 * their own label ("My Vendors", not "Vendors"); hrefs the role cannot see drop out.
 */
export function moreGroups(items: readonly NavItem[]): { label: string; items: NavItem[] }[] {
  const byHref = new Map<string, NavItem>();
  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) byHref.set(child.href, child);
    } else {
      byHref.set(item.href, item);
    }
  }
  return MOBILE_MORE_GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs.flatMap((href) => byHref.get(href) ?? []),
  })).filter((group) => group.items.length > 0);
}

export function navItemsForRole(
  role: MemberRole,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem[] {
  return items
    .filter((item) => !item.adminOnly || role === "ADMIN")
    .map((item) =>
      item.children ? { ...item, children: navItemsForRole(role, item.children) } : { ...item },
    );
}

/** Exact match for the dashboard root; prefix match for sections. */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
