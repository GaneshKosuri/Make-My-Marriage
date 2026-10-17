/** Copy for the create-wedding onboarding screen (Stitch "Create Wedding", PRD §9.2). */

export const CREATE_WEDDING = {
  eyebrow: "Step 1 of 1",
  title: "Create your wedding",
  description: "Tell us the basics. You can change these any time.",
  submit: "Create wedding",
  pending: "Creating your wedding…",
  fields: {
    brideName: { label: "Bride's name", placeholder: "e.g. Juliet" },
    groomName: { label: "Groom's name", placeholder: "e.g. Romeo" },
    weddingDate: { label: "Wedding date" },
    city: { label: "City", placeholder: "e.g. Dehradun" },
    state: { label: "State", placeholder: "e.g. Uttarakhand" },
    country: { label: "Country" },
    title: {
      label: "Wedding title",
      hint: "Shown on your dashboard and wedding website.",
    },
    description: { label: "A few words", placeholder: "We're getting married!" },
    timeZone: { label: "Time zone" },
  },
  timeZonePrefix: "Time zone:",
  changeTimeZone: "Change",
  adminNote: "You'll be the Admin. You can invite family members next.",
  invitedNote: {
    title: "Invited by family?",
    description:
      "Open the invitation link from your email to join their wedding instead of creating a new one.",
  },
  alreadyHasWedding: {
    title: "You already belong to a wedding.",
    action: "Go to your dashboard",
  },
  sessionEnded: { title: "Your session has ended.", action: "Sign in again" },
  signedInAs: "Signed in as",
  preview: {
    eyebrow: "Your wedding workspace",
    placeholderCouple: "Groom & Bride",
    placeholderDate: "Your wedding date",
    placeholderCity: "Your city",
    countdownPending: "Countdown starts once the date is set",
  },
} as const;

/** Friendly names for the most common zones; the rest show their IANA id. */
export const TIME_ZONE_LABELS: Readonly<Record<string, string>> = {
  "Asia/Kolkata": "India (IST)",
  "Asia/Dubai": "UAE (GST)",
  "Asia/Singapore": "Singapore (SGT)",
  "Europe/London": "United Kingdom",
  "America/New_York": "US Eastern",
  "America/Los_Angeles": "US Pacific",
  "Australia/Sydney": "Australia Eastern",
};

export function timeZoneLabel(timeZone: string): string {
  return TIME_ZONE_LABELS[timeZone] ?? timeZone.replace(/_/g, " ");
}
