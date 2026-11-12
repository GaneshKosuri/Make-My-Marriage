/**
 * Copy for the Events screens (PRD §9.5). Kept in one place so the screens and
 * their tests agree. Styled like the dashboard (decided 2026-11-04).
 */

/** The add form opens straight away on `/app/events?new=1` (dashboard and "+" links). */
export const NEW_EVENT_PARAM = "new";

export const EVENTS_ROUTES = {
  list: "/app/events",
  add: `/app/events?${NEW_EVENT_PARAM}=1`,
  event: (eventId: string) => `/app/events/${eventId}`,
} as const;

export const EVENTS = {
  eyebrow: "Planning",
  title: "Events",
  description: "Every ceremony in one place, from the Roka to the Reception.",
  timeZoneNote: (zone: string) => `Times are in ${zone}, the wedding's time zone.`,
  add: "Add event",
  upcoming: "Upcoming",
  past: "Past",
  archived: "Archived",
  archivedNote: "Archived events stay linked to their tasks and guests, but are left out of plans.",
  showArchived: "Show archived events",
  hideArchived: "Hide archived events",
  noUpcoming: "Nothing coming up. Add the next ceremony when you're ready.",
  dressCode: "Dress code",
  archivedBadge: "Archived",
  empty: {
    title: "No events yet",
    description: "Add your ceremonies, such as Mehendi, Haldi, Sangeet and the Wedding.",
    action: "Add your first event",
    suggestions: "Or start with",
  },
  loadError: { title: "We couldn't load your events.", retry: "Try again" },
  form: {
    addTitle: "Add event",
    editTitle: "Edit event",
    description: (zone: string) => `Times are in ${zone}.`,
    typeLegend: "Occasion",
    fields: {
      name: { label: "Event name", placeholder: "e.g. Mehendi" },
      date: { label: "Date" },
      startTime: { label: "Starts at" },
      endDate: { label: "Ends on" },
      endTime: { label: "Ends at" },
      venueName: { label: "Venue", placeholder: "e.g. Royal Garden" },
      address: { label: "Address", placeholder: "Street, area, city" },
      dressCode: { label: "Dress code", placeholder: "e.g. Green / Traditional" },
      description: { label: "Notes", placeholder: "Anything the family should know" },
    },
    endsNextDay: "Ends the next day",
    endDateHint: "For events over more than a day.",
    cancel: "Cancel",
    save: "Save event",
    saving: "Saving…",
    added: (name: string) => `${name} added.`,
    updated: (name: string) => `${name} saved.`,
    conflict: {
      title: "Someone else changed this event",
      description: "Reload it to see their changes, then make yours again.",
      action: "Reload event",
    },
    gone: {
      title: "This event can't be changed",
      description: "It was archived or removed. Close this form to see the latest.",
    },
    error: {
      title: "We couldn't save the event",
      description: "Check your connection and try again.",
    },
  },
  detail: {
    /** Eyebrow when the name already says the occasion ("Mehendi"). */
    eyebrow: "Event",
    back: "All events",
    when: "When and where",
    notes: "Notes",
    time: "Time",
    edit: "Edit",
    archive: "Archive",
    nextDay: "next day",
    noVenue: "Venue not added yet",
    openInMaps: "Open in Google Maps",
    archivedBanner: (date: string) =>
      `Archived on ${date}. It stays linked to its tasks and guests, but can't be changed.`,
    notFound: {
      title: "We couldn't find this event",
      description: "It may belong to another wedding, or the link is wrong.",
    },
    confirmArchive: {
      title: (name: string) => `Archive ${name}?`,
      description:
        "It leaves your plans and the dashboard. Tasks and guests linked to it keep the link. This can't be undone yet.",
      /** PRD §14: warn before an action that changes guests' invitations. */
      invitedGuests: (count: number, name: string) =>
        `${count === 1 ? "1 guest is" : `${count} guests are`} invited to ${name}. It will disappear from their invitations.`,
      confirm: "Archive event",
      cancel: "Keep event",
      error: "We couldn't archive the event. Try again.",
    },
  },
} as const;
