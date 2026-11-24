/**
 * Copy for the wedding website screens and the public site's own messages
 * (PRD §9.18–9.19). Layout follows the Stitch screens; wording follows the
 * docs (decided 2026-11-24).
 */

export const WEBSITE_ROUTES = {
  settings: "/app/website",
  preview: "/app/website/preview",
  events: "/app/events",
} as const;

export const PUBLIC_SITE = {
  unavailable: {
    title: "This website isn't available",
    description: "Check the link with the family.",
  },
  busy: {
    title: "The website isn't available right now",
    description: "Please try again in a little while.",
    retry: "Try again",
  },
  preview: {
    banner: "Preview — only your family can see this.",
    draft: "Not published yet.",
    published: "This is what guests see.",
    back: "Back to settings",
  },
} as const;
