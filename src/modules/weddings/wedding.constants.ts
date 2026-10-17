/**
 * Wedding, website, gallery and livestream constants (PRD §9.2, §9.18–9.24;
 * DATABASE_DESIGN §13–22; SYSTEM_DESIGN §27–28). Isomorphic.
 */

export const WEBSITE_THEMES = ["CLASSIC", "MINIMAL", "MODERN"] as const;
export type WebsiteTheme = (typeof WEBSITE_THEMES)[number];

export const WEBSITE_THEME_LABELS: Record<WebsiteTheme, string> = {
  CLASSIC: "Classic Indian",
  MINIMAL: "Minimal Elegant",
  MODERN: "Modern Celebration",
};

export const DEFAULT_WEBSITE_THEME: WebsiteTheme = "CLASSIC";
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";
/** Prefilled on the create-wedding form; destination weddings change it. */
export const DEFAULT_COUNTRY = "India";

export const COUPLE_NAME_MAX_LENGTH = 80;
export const WEDDING_TITLE_MAX_LENGTH = 120;
export const WEDDING_DESCRIPTION_MAX_LENGTH = 2000;
export const WELCOME_MESSAGE_MAX_LENGTH = 1000;
export const FORMATTED_ADDRESS_MAX_LENGTH = 300;
export const LOCATION_PART_MAX_LENGTH = 100;
export const GOOGLE_PLACE_ID_MAX_LENGTH = 300;
export const YOUTUBE_URL_MAX_LENGTH = 300;

/**
 * `groomName-brideName-ddmmyyyy`, lowercase, with `-2`, `-3` … on collision
 * (SYSTEM_DESIGN §27). Groom first matches the default couple title
 * ("Romeo & Juliet"); decided 2026-10-10, see docs/PROJECT_STATUS.md.
 */
export const WEDDING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const WEDDING_SLUG_MAX_LENGTH = 120;
