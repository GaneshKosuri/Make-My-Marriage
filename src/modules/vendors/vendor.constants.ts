/** My Vendors + discovery (PRD §9.16–9.17; DATABASE_DESIGN §49–54). Isomorphic. */

export const VENDOR_CATEGORIES = [
  "PHOTOGRAPHER",
  "VIDEOGRAPHER",
  "VENUE",
  "CATERER",
  "DECORATOR",
  "DJ",
  "MAKEUP_ARTIST",
  "MEHENDI_ARTIST",
  "PANDIT",
  "CHOREOGRAPHER",
  "FLORIST",
  "WEDDING_PLANNER",
  "TRANSPORT",
  "OTHER",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  VENUE: "Venue",
  CATERER: "Caterer",
  DECORATOR: "Decorator",
  DJ: "DJ",
  MAKEUP_ARTIST: "Makeup Artist",
  MEHENDI_ARTIST: "Mehendi Artist",
  PANDIT: "Pandit",
  CHOREOGRAPHER: "Choreographer",
  FLORIST: "Florist",
  WEDDING_PLANNER: "Wedding Planner",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

export const VENDOR_SOURCES = ["MANUAL", "GOOGLE_PLACES"] as const;
export type VendorSource = (typeof VENDOR_SOURCES)[number];

/** Search keywords sent to the discovery provider (PRD §9.17). */
export const VENDOR_DISCOVERY_KEYWORDS: Record<VendorCategory, string> = {
  PHOTOGRAPHER: "wedding photographer",
  VIDEOGRAPHER: "wedding videographer",
  VENUE: "wedding venue",
  CATERER: "wedding caterer",
  DECORATOR: "wedding decorator",
  DJ: "wedding DJ",
  MAKEUP_ARTIST: "bridal makeup artist",
  MEHENDI_ARTIST: "mehendi artist",
  PANDIT: "pandit for wedding",
  CHOREOGRAPHER: "wedding choreographer",
  FLORIST: "florist",
  WEDDING_PLANNER: "wedding planner",
  TRANSPORT: "wedding car rental",
  OTHER: "wedding services",
};

export const VENDOR_NAME_MAX_LENGTH = 120;
export const VENDOR_CONTACT_MAX_LENGTH = 120;
export const VENDOR_PHONE_MAX_LENGTH = 40;
export const VENDOR_EMAIL_MAX_LENGTH = 254;
export const VENDOR_ADDRESS_MAX_LENGTH = 500;
export const VENDOR_WEBSITE_MAX_LENGTH = 300;
export const VENDOR_NOTES_MAX_LENGTH = 2000;
export const VENDOR_SEARCH_MAX_LENGTH = 120;
/** A vendor works at a handful of events; the cap only guards the request size. */
export const VENDOR_MAX_EVENTS = 100;
/** Digits and + ( ) - . and spaces, as for guests. */
export const VENDOR_PHONE_PATTERN = /^[0-9+()\-.\s]*$/;
/** Integer paise; ₹100 crore as a sanity bound on the agreed cost (not a budget). */
export const VENDOR_AGREED_COST_MAX_PAISE = 100_000_000_000;

// ── Discovery (PRD §9.17; API_DESIGN §65–66) ───────────────────────────────
/** "Near" is a place name ("Dehradun, Uttarakhand"), defaulting to the wedding's city. */
export const VENDOR_DISCOVERY_NEAR_MAX_LENGTH = 120;
/** Optional extra words, e.g. "candid" or "pure veg". */
export const VENDOR_DISCOVERY_QUERY_MAX_LENGTH = 80;
/** Results per search (Google's page size; no paging). */
export const VENDOR_DISCOVERY_MAX_RESULTS = 20;
/** Google place ids are URL-safe base64-like strings. */
export const GOOGLE_PLACE_ID_MAX_LENGTH = 300;
export const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
