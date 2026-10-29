/**
 * Copy for Settings → Wedding Details (PRD §9.25, API_DESIGN §19). Field labels
 * come from the create-wedding copy so both forms read the same.
 */
export const WEDDING_DETAILS = {
  eyebrow: "Settings",
  title: "Wedding Details",
  description: "Names, date and place shown across your workspace and wedding website.",
  coupleSection: "The couple",
  dateSection: "Date and place",
  aboutSection: "About your wedding",
  save: "Save changes",
  saving: "Saving…",
  discard: "Discard changes",
  saved: "Your wedding details are saved.",
  websiteAddress: {
    label: "Wedding website address",
    note: "It stays the same when you change names or the date, so links you've shared keep working.",
  },
  coverNote: "A cover photo can be added once the wedding website is ready.",
  loadError: { title: "We couldn't load your wedding details.", retry: "Try again" },
  saveError: {
    title: "Your changes weren't saved.",
    description: "Please check your connection and try again.",
  },
} as const;
