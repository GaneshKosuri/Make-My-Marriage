/**
 * Copy for the wedding website screens and the public site's own messages
 * (PRD §9.18–9.19). Layout follows the Stitch screens; wording follows the
 * docs (decided 2026-11-24).
 */
import type { WebsiteTheme } from "@/modules/weddings/wedding.constants";

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

export const THEME_CHOICES: Record<WebsiteTheme, { name: string; description: string }> = {
  CLASSIC: { name: "Classic Indian", description: "Traditional and decorative" },
  MINIMAL: { name: "Minimal Elegant", description: "Clean and quiet" },
  MODERN: { name: "Modern Celebration", description: "Bright and contemporary" },
};

export const WEBSITE = {
  eyebrow: "Website",
  title: "Wedding website",
  description: "A simple website for your guests with your events, photos and livestream.",
  preview: "Preview site",
  publish: "Publish",
  unpublish: "Unpublish",
  status: {
    draft: "Draft — only your family can see it",
    published: "Published",
    address: "Website address",
    copy: "Copy link",
    copied: "Link copied",
    copyFailed: "Couldn't copy. Select the address and copy it instead.",
    whatsapp: "Share on WhatsApp",
    draftShareNote: "Publish your website first, so guests can open the link.",
  },
  whatsappMessage: (couple: string, url: string) =>
    `${couple} are getting married! See the events and details here: ${url}`,
  theme: {
    title: "Theme",
    description: "Choose how your website looks. Your details stay the same.",
    tryIt: (name: string) => `Preview ${name}`,
  },
  cover: {
    title: "Cover photo",
    description: "Shown at the top of your website.",
    hint: "JPEG, PNG or WebP · up to 10 MB",
    add: "Add a cover photo",
    change: "Change photo",
    remove: "Remove",
    uploading: "Uploading…",
    empty: "No cover photo yet. Your website shows the theme's own design instead.",
    alt: "Cover photo",
    invalid: "Use a JPEG, PNG or WebP photo up to 10 MB.",
    failed: "We couldn't upload the photo. Try again.",
    saved: "Cover photo saved.",
    removed: "Cover photo removed.",
  },
  welcome: {
    title: "Welcome message",
    label: "Welcome message",
    placeholder: "We would love for you to celebrate with us…",
    hint: "A short note at the top of your website.",
    count: (n: number, max: number) => `${n} / ${max}`,
  },
  onSite: {
    title: "On your website",
    gallery: {
      label: "Show the gallery",
      hint: "Adds a “See and add photos” button for guests. Only shows while the gallery is on.",
    },
    events: "Every event appears on your website. Archive an event to hide it.",
    manageEvents: "Manage events",
  },
  saveBar: {
    unsaved: "You have unsaved changes",
    discard: "Discard",
    save: "Save changes",
    saving: "Saving…",
    saved: "Changes saved.",
    error: "We couldn't save your changes. Try again.",
  },
  publishDialog: {
    title: "Publish your website?",
    description:
      "Anyone with the link will see your names, date, events and venues. Search engines won't list it.",
    cancel: "Not yet",
    confirm: "Publish",
    done: "Your website is published.",
  },
  unpublishDialog: {
    title: "Unpublish your website?",
    description: "Guests with the link will see “This website isn't available”.",
    cancel: "Keep it published",
    confirm: "Unpublish",
    done: "Your website is unpublished.",
  },
  loadError: { title: "We couldn't load your website settings.", retry: "Try again" },
} as const;
