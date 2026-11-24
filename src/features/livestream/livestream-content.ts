/**
 * Copy for the Livestream screen (PRD §9.24). Layout follows the Stitch
 * screens; wording follows the docs (decided 2026-11-24).
 */
export const LIVESTREAM = {
  eyebrow: "Live stream",
  title: "Livestream",
  description:
    "Share the ceremony with family who can't be there. Stream on YouTube, then paste the link here.",
  link: {
    title: "YouTube link",
    label: "YouTube link",
    placeholder: "https://youtube.com/live/…",
    hint: "Paste the link to the live stream or video. Channel links don't work: open the stream and copy its link.",
    invalid:
      "This isn't a YouTube video or live stream link. Channel links don't work: open the stream and copy its link.",
    save: "Save link",
    saving: "Saving…",
    saved: "Link saved.",
  },
  preview: {
    title: "Preview",
    caption: "This is how guests will see it on your website.",
    playerTitle: "Livestream preview",
  },
  empty: {
    title: "No livestream yet",
    description: "Create the live stream on YouTube, then paste its link here.",
  },
  show: {
    label: "Show on the website",
    hint: "Turn it on before the ceremony and off afterwards.",
    needsLink: "Save a YouTube link first.",
    on: "The livestream is on your website.",
    off: "The livestream is hidden from your website.",
  },
  remove: {
    action: "Remove livestream",
    title: "Remove the livestream?",
    description:
      "The link is deleted and the player leaves your website. You can add a new link any time.",
    cancel: "Keep it",
    confirm: "Remove",
    removed: "Livestream removed.",
  },
  saveError: "We couldn't save that. Try again.",
  loadError: { title: "We couldn't load the livestream settings.", retry: "Try again" },
} as const;
