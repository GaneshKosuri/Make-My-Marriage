/**
 * Copy for the wedding dashboard (PRD §9.3; Stitch "Desktop Command Center" and
 * Mobile M1, M4, M5). Kept in one place so the screen and its tests agree.
 */

export const DASHBOARD_ROUTES = {
  events: "/app/events",
  event: (eventId: string) => `/app/events/${eventId}`,
  tasks: "/app/tasks",
  myTasks: "/app/tasks?mine=true",
  guests: "/app/guests",
  rsvp: "/app/guests/rsvp",
  expenses: "/app/expenses",
  vendors: "/app/vendors",
  members: "/app/settings/members",
  weddingDetails: "/app/settings",
  website: "/app/website",
} as const;

export const DASHBOARD = {
  hero: {
    eyebrow: "Your wedding",
    editDetails: "Edit wedding details",
    editDetailsShort: "Edit details",
    viewWebsite: "View wedding website",
    viewWebsiteShort: "View website",
    untilTheDay: "Until your wedding day",
  },
  welcome: {
    title: (couple: string) => `Welcome, ${couple}!`,
    description: "Let's start planning. Add your ceremonies, then your tasks and guests.",
  },
  summaryHeading: "At a glance",
  nothingYet: "Nothing here yet",
  cards: {
    events: { label: "Events", unit: "events planned", link: "View events" },
    tasks: { label: "Tasks", unit: "completed", link: "View tasks" },
    guests: { label: "Guests", unit: "guests invited", link: "Guest list" },
    rsvps: {
      label: "RSVPs",
      stillToReply: (count: number) => `${count} still to reply`,
      allReplied: "Everyone has replied",
      link: "RSVP status",
    },
    expenses: { label: "Expenses", unit: "recorded so far", link: "View expenses" },
    vendors: { label: "Vendors", unit: "vendors saved", link: "My vendors" },
  },
  events: {
    title: "Upcoming events",
    add: "Add event",
    all: "All events",
    dressCode: "Dress code",
    empty: {
      title: "No events yet",
      description: "Add your ceremonies, such as Mehendi, Haldi, Sangeet and the Wedding.",
      action: "Add your first event",
    },
  },
  tasks: {
    title: "Upcoming tasks",
    all: "All tasks",
    mine: "My tasks",
    due: "Due",
    overdue: "Overdue",
    empty: {
      title: "No tasks yet",
      description: "Add the things to do, who is doing them and when they are due.",
      action: "Add a task",
    },
  },
  rsvp: {
    title: "RSVP overview",
    description: "Replies from your guests",
    attending: "Attending",
    pending: "Pending",
    notAttending: "Not attending",
    peopleAttending: (count: number) =>
      count === 1 ? "1 person attending" : `${count} people attending`,
    headcount: "Total confirmed headcount",
    link: "RSVP status",
    empty: {
      title: "No replies yet",
      description: "Add guests and send their invitations; their replies will show here.",
      action: "Add your guests",
    },
  },
  checklist: {
    title: "Get started",
    description: "Five steps to set up your wedding",
    progress: (done: number, total: number) => `${done} of ${total} done`,
    steps: {
      event: {
        title: "Create your first event",
        hint: "Mehendi, Haldi, Sangeet, Wedding…",
        action: "Add your first event",
      },
      task: { title: "Add a task", hint: "Something to do, with a due date", action: "Add a task" },
      guests: {
        title: "Add your guests",
        hint: "Add each family once and say how many can come",
        action: "Add guests",
      },
      member: {
        title: "Invite a family member",
        hint: "Parents and siblings can help plan",
        managerHint: "An Admin can invite parents and siblings to help plan",
        action: "Invite family",
      },
      invitations: {
        title: "Send invitations",
        hint: "Share each guest's invitation link",
        action: "Send invitations",
      },
    },
  },
  error: {
    title: "We couldn't load your dashboard.",
    description: "Please check your connection and try again.",
    retry: "Try again",
  },
  loading: "Loading your dashboard",
} as const;
