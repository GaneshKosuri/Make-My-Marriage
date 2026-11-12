/**
 * Copy for the guest screens (PRD §9.7–9.8, §9.11). Kept in one place so the
 * screens and their tests agree. Styled like the dashboard (decided 2026-11-12).
 */
import type { RsvpStatus } from "@/modules/guests/guest.constants";

/** URL parameters /app/guests understands (dashboard and "+" links use them). */
export const GUESTS_PARAMS = {
  search: "search",
  rsvpStatus: "rsvpStatus",
  eventId: "eventId",
  invitationSent: "invitationSent",
  /** Opens the add form straight away. */
  add: "new",
} as const;

export const GUESTS_ROUTES = {
  list: "/app/guests",
  add: `/app/guests?${GUESTS_PARAMS.add}=1`,
  guest: (guestId: string) => `/app/guests/${guestId}`,
  rsvp: "/app/guests/rsvp",
  /** The RSVP page opened on one status. */
  rsvpFor: (status: RsvpStatus) => `/app/guests/rsvp?status=${status}`,
} as const;

/** "Sent" / "Not sent" filter values, as the address carries them. */
export const INVITATION_SENT_OPTIONS = ["true", "false"] as const;

export const GUESTS = {
  eyebrow: "Guests",
  title: "Guest List",
  description: "One entry per invitation: a person, a couple or a whole family.",
  add: "Add guest",
  summary: {
    label: "Guest list at a glance",
    invitations: "Invitations",
    attending: "People coming",
    pending: "Awaiting reply",
    rsvpLink: "RSVP status",
  },
  search: { label: "Search guests", placeholder: "Name, email or phone" },
  filters: {
    label: "Filters",
    /** The phone toggle, with how many filters are on. */
    toggle: (active: number) => (active > 0 ? `Filters (${active})` : "Filters"),
    rsvp: "RSVP",
    anyRsvp: "Any reply",
    event: "Event",
    anyEvent: "Any event",
    invitation: "Invitation",
    anyInvitation: "Sent or not",
    sent: "Sent",
    notSent: "Not sent",
    clear: "Clear filters",
  },
  count: (from: number, to: number, total: number) =>
    total === 0 ? "No guests" : `${from}–${to} of ${total}`,
  previous: "Previous",
  next: "Next",
  partySize: (count: number) => (count === 1 ? "1 person" : `Up to ${count}`),
  noEvents: "No events chosen yet",
  archivedEvent: (name: string) => `${name} (archived)`,
  open: (name: string) => `Open ${name}`,
  edit: (name: string) => `Edit ${name}`,
  empty: {
    title: "No guests yet",
    description:
      "Add each invitation once, with how many people it covers and which events they're invited to.",
    action: "Add your first guest",
  },
  noMatches: {
    title: "No guests match",
    description: "Try another search or filter, or clear them to see everyone.",
  },
  loadError: { title: "We couldn't load your guests.", retry: "Try again" },
  form: {
    addTitle: "Add guest",
    editTitle: "Edit guest",
    fields: {
      name: { label: "Name", placeholder: "e.g. Rajesh Sharma or The Sharma family" },
      maxGuests: {
        label: "People invited",
        hint: "Everyone this invitation covers, including the person named. They can reply for up to this many.",
        decrease: "One fewer person",
        increase: "One more person",
      },
      email: { label: "Email", placeholder: "name@example.com" },
      phone: { label: "Phone", placeholder: "+91 98765 43210" },
      events: {
        label: "Invited to",
        hint: "Their invitation will show only these events.",
        all: "Select all",
        none: "Clear all",
        noEvents: "Add your events first; you can invite this guest to them later.",
      },
      notes: { label: "Notes", placeholder: "Relation, dietary needs, anything to remember" },
    },
    optionsError: "We couldn't load the wedding's events for this form.",
    optionsRetry: "Try again",
    cancel: "Cancel",
    save: "Save guest",
    saving: "Saving…",
    delete: "Delete guest",
    confirmDelete: {
      prompt: "Delete this guest? Their invitation link stops working. This can't be undone.",
      confirm: "Yes, delete",
      cancel: "Keep",
    },
    added: (name: string) => `${name} added.`,
    updated: (name: string) => `${name} saved.`,
    deleted: (name: string) => `${name} deleted.`,
    conflict: {
      title: "This guest changed while you were editing",
      description:
        "Someone else saved changes, or the guest replied. Reload to see the latest, then make your changes again.",
      action: "Reload guest",
    },
    gone: {
      title: "This guest no longer exists",
      description: "Someone may have deleted them. Close this form to see the latest.",
    },
    error: {
      title: "We couldn't save the guest",
      description: "Check your connection and try again.",
    },
  },
  detail: {
    back: "Guest List",
    eyebrow: "Guest",
    edit: "Edit",
    delete: "Delete",
    rsvp: "RSVP",
    invitation: "Invitation",
    contact: "Contact",
    notes: "Notes",
    partySize: (count: number) =>
      count === 1 ? "Invited: 1 person" : `Invited: up to ${count} people`,
    rsvpUpdated: (when: string) => `Replied ${when}`,
    noReply: "No reply yet. Their invitation link and email arrive in the next update.",
    events: "Events",
    noEventsInvited: "Not invited to any events yet.",
    sent: (when: string) => `Invitation emailed ${when}`,
    notSent: "Invitation not sent yet",
    noContact: "No email or phone number.",
    notFound: {
      title: "Guest not found",
      description: "This guest may have been deleted, or the link is wrong.",
    },
    confirmDelete: {
      title: (name: string) => `Delete ${name}?`,
      description:
        "Their invitation link stops working and their RSVP is removed. This can't be undone.",
      cancel: "Keep guest",
      confirm: "Delete guest",
      error: "We couldn't delete the guest. Try again.",
    },
  },
  rsvp: {
    eyebrow: "Guests",
    title: "RSVP",
    description: "Who has replied, who is coming and who still needs a nudge.",
    stats: {
      peopleComing: "People coming",
      attending: "Attending",
      notAttending: "Not attending",
      pending: "Awaiting reply",
      invitations: (count: number) => (count === 1 ? "1 invitation" : `${count} invitations`),
      unit: (count: number) => (count === 1 ? "invitation" : "invitations"),
    },
    tabs: {
      label: "Show guests",
    },
    empty: {
      PENDING: "Everyone has replied.",
      ATTENDING: "No one has said yes yet.",
      NOT_ATTENDING: "No one has declined.",
    } satisfies Record<RsvpStatus, string>,
    noGuests: {
      title: "No guests yet",
      description: "Add guests, and their replies will show here.",
      action: "Add guests",
    },
    remindersSoon: "Email reminders for guests who haven't replied arrive in the next update.",
  },
} as const;

/** What a guest's reply is called on these screens. */
export const RSVP_LABELS: Readonly<Record<RsvpStatus, string>> = {
  PENDING: "Awaiting reply",
  ATTENDING: "Attending",
  NOT_ATTENDING: "Not attending",
};

/** Short RSVP labels for pills ("Attending · 3"). */
export function rsvpLabel(status: RsvpStatus, attendingCount: number | null): string {
  return status === "ATTENDING"
    ? `${RSVP_LABELS.ATTENDING} · ${attendingCount ?? 0}`
    : RSVP_LABELS[status];
}
