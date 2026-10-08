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
      { label: "Wedding Members", href: "/app/settings/members", adminOnly: true },
    ],
  },
];

/** Primary destinations for the mobile bottom bar; everything else is in the menu drawer. */
export const MOBILE_PRIMARY_HREFS = ["/app", "/app/events", "/app/guests", "/app/tasks"] as const;

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
