/**
 * Copy for a guest's own invitation page, /invite/[token] (PRD §9.10–9.11).
 * Guests have no account and may be any age: short sentences, no jargon.
 */

export const INVITATION = {
  eyebrow: "You're invited",
  welcome: (couple: string) => `${couple} would love for you to celebrate their wedding with them.`,
  dear: (name: string) => `Dear ${name},`,
  partySize: (count: number) =>
    count === 1 ? "This invitation is for you." : `This invitation is for up to ${count} people.`,
  events: {
    title: (count: number) => (count === 1 ? "The celebration" : "The celebrations"),
    none: "The details of the celebrations will appear here soon.",
    maps: "Open in Google Maps",
    dressCode: "Dress code",
  },
  rsvp: {
    title: "RSVP",
    attendingQuestion: "Will you be attending?",
    yes: "Yes, I'll be there",
    no: "Sorry, I can't come",
    countQuestion: "How many people will attend?",
    countHint: (max: number) => `Including you. Up to ${max}.`,
    decrease: "One fewer person",
    increase: "One more person",
    send: "Send reply",
    update: "Update reply",
    sending: "Sending…",
    cancel: "Keep my reply",
    change: "Change reply",
    thanks: "Thank you for letting us know!",
    coming: (count: number) =>
      count === 1
        ? "You're coming. See you there!"
        : `You're coming with ${count} people in all. See you there!`,
    notComing: "You can't make it. You'll be missed!",
    canChange: "Plans change? You can update your reply here any time.",
    chooseAttending: "Choose yes or no.",
    chooseCount: "Choose how many people will attend.",
    errors: {
      partySize:
        "The number of people on this invitation has changed. Please check your reply and send it again.",
      conflict: "Your invitation was just updated. Please check your reply and send it again.",
      rateLimited: "You've changed your reply many times. Please wait a few minutes and try again.",
      gone: "This invitation is no longer available.",
      network: "We couldn't send your reply. Check your connection and try again.",
    },
  },
  notFound: {
    title: "This invitation isn't available",
    description:
      "The link may be incomplete, or the invitation was withdrawn. Please ask the family who sent it for a new link.",
  },
  unavailable: {
    title: "We couldn't open your invitation",
    description: "Please wait a moment and try again.",
    retry: "Try again",
  },
  footer: "Made with Make My Marriage",
} as const;
