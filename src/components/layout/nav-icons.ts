import {
  CalendarDays,
  Globe,
  Images,
  LayoutDashboard,
  ListChecks,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons and one-line hints for navigation, looked up by href on the client
 * (components cannot cross the server → client boundary inside nav items).
 */
export const NAV_ICONS: Readonly<Record<string, LucideIcon>> = {
  "/app": LayoutDashboard,
  "/app/events": CalendarDays,
  "/app/tasks": ListChecks,
  "/app/guests": Users,
  "/app/expenses": Wallet,
  "/app/vendors": Store,
  "/app/vendors/discover": Search,
  "/app/website": Globe,
  "/app/photos": Images,
  "/app/photos/qr": QrCode,
  "/app/livestream": Video,
  "/app/settings": Settings,
  "/app/settings/members": ShieldCheck,
};

/** Hints under each row of the mobile "More" sheet. */
export const NAV_HINTS: Readonly<Record<string, string>> = {
  "/app/expenses": "Record money spent",
  "/app/vendors": "Vendors you have saved",
  "/app/vendors/discover": "Find vendors near you",
  "/app/website": "Your wedding's own web page",
  "/app/photos": "Your private photo gallery",
  "/app/photos/qr": "Share your gallery",
  "/app/livestream": "Add a YouTube link",
  "/app/settings": "Names, date and place",
  "/app/settings/members": "Invite and manage family members",
};
