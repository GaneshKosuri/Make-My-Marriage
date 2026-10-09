/**
 * Home page copy and sample data, in one place (Stitch "Home Screen - Desktop" /
 * "Home Screen - Mobile", aligned with PRD V1 scope). Every claim here must be
 * something V1 actually does or is listed as coming soon in
 * ./feature-availability.ts — no seating, meal preferences, budgets, payments,
 * contracts, real-time sync or custom domains (PRD §7).
 *
 * The sample wedding (Romeo & Juliet, Dehradun, 14 Feb 2027) is illustrative.
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  Camera,
  CircleHelp,
  ClipboardList,
  EyeOff,
  Globe,
  Heart,
  Images,
  KeyRound,
  LayoutGrid,
  Link as LinkIcon,
  Lock,
  Milestone,
  PanelsTopLeft,
  RectangleEllipsis,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
  Workflow,
} from "lucide-react";

import type { MemberRole } from "@/modules/members/member.constants";
import type { WebsiteTheme } from "@/modules/weddings/wedding.constants";

import type { ProductFeature } from "./feature-availability";

export const ROUTES = {
  signUp: "/signup",
  signIn: "/login",
} as const;

/** In-page anchors used by the header, footer and calls to action. */
export const SECTION_IDS = {
  features: "features",
  events: "events",
  families: "families",
  guests: "guests",
  privacy: "privacy",
  howItWorks: "how-it-works",
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Features", href: `#${SECTION_IDS.features}` },
  { label: "Events", href: `#${SECTION_IDS.events}` },
  { label: "For families", href: `#${SECTION_IDS.families}` },
  { label: "Guests", href: `#${SECTION_IDS.guests}` },
  { label: "Privacy", href: `#${SECTION_IDS.privacy}` },
];

export const BRAND = {
  name: "Make My Marriage",
  tagline: "The wedding workspace",
} as const;

export interface SectionCopy {
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  intro: string;
}

// ── Hero ──────────────────────────────────────────────────────────────────

export const HERO = {
  eyebrow: "The wedding workspace",
  icon: SlidersHorizontal,
  titleLines: ["Your whole wedding,", "in one place."],
  intro:
    "Bring family, events, guests, RSVPs, vendors, expenses, and photos into one shared workspace, instead of chaotic WhatsApp groups and spreadsheets.",
  primaryCta: "Start planning",
  secondaryCta: "See how it works",
  note: "Built for Indian weddings. Guests never need an account.",
} as const;

export const SAMPLE_WEDDING = {
  couple: "Romeo & Juliet",
  dateAndPlace: "14 February 2027 · Dehradun",
  daysToGo: "42 Days to Go",
  nextEvent: "Next event: Mehendi · 12 Feb · 3:00 PM",
} as const;

export const WORKSPACE_PREVIEW = {
  label: "Master wedding workspace",
  status: "Active planning",
  countdownLabel: "Ritual countdown",
  tasks: { done: 32, total: 48 },
  stats: [
    { value: "7", label: "Events", detail: "Roka to Reception" },
    { value: "32/48", label: "Tasks done", detail: "66% completed" },
    { value: "186", label: "Guests", detail: "Invitations" },
    { value: "132", label: "RSVPs", detail: "71% responded" },
  ],
  scheduleLabel: "Upcoming schedule",
  schedule: [
    {
      initial: "R",
      name: "Roka & Chunni",
      when: "12 Nov 2026 · 11:00 AM · Delhi",
      whenShort: "Completed",
      done: true,
    },
    {
      initial: "H",
      name: "Haldi Rasam",
      when: "13 Feb 2027 · Courtyard Lawn",
      whenShort: "13 Feb · 10:00 AM",
      done: false,
    },
  ],
  rsvp: {
    label: "Guest RSVP view",
    tag: "No login needed",
    initials: "RS",
    guest: "Rajesh Sharma & Family",
    invitedTo: "Invited to 3 ceremonies",
    party: "Party of 4",
    response: "Attending · 4",
    summary: "4 attending · 3 ceremonies",
    saved: "RSVP saved ✓",
  },
} as const;

// ── "Twelve places" ───────────────────────────────────────────────────────

export const TRANSFORMATION = {
  eyebrow: "The transformation",
  icon: ArrowLeftRight,
  title: "Wedding planning shouldn't live in twelve places.",
  intro:
    "Replace fragmented messages, missing files, and duplicate vendor lists with a single architectural foundation built for family harmony.",
  scattered: [
    { source: "WhatsApp Group #4", quote: "Who has the panditji's final muhurat timing?" },
    { source: "Excel Spreadsheet", quote: "Guests_Final_v4_FINAL.xlsx" },
    { source: "Apple Notes", quote: "Tent advance paid ₹50k, balance pending" },
    { source: "Missed Calls", quote: "Has anyone booked the Sangeet DJ?" },
    { source: "Shared Drive Link", quote: "Permission denied: Sangeet playlist" },
    { source: "Family Chat", quote: "Did someone reply to Sharma ji's RSVP?" },
  ],
  scatteredCompact: [
    "WhatsApp Group #1 (72 unread debates)",
    "Excel Spreadsheet 'Final_v7_Updated.xlsx'",
    "Scattered Apple Notes with caterer phone numbers",
    "Has anyone booked the Sangeet DJ?",
  ],
  unifiedLabel: "Unified into",
  solution: {
    name: "Make My Marriage",
    tagline: "Single Source of Truth",
    title: "Order, clarity & generational peace.",
    text: "Ceremonies, guests, RSVPs, family tasks and vendors in one shared workspace.",
    points: [
      { icon: CalendarDays, text: "Every ceremony's date, venue and dress code" },
      { icon: Users, text: "186 guests, each invited to the right ceremonies" },
      { icon: BadgeCheck, text: "Tasks assigned to family members with due dates" },
      { icon: Lock, text: "Private, unguessable links. Guests never log in." },
    ],
    highlights: [
      { icon: CalendarCheck, title: "Ceremonies", text: "Dates, venues, dress codes" },
      { icon: ShieldCheck, title: "Family roles", text: "Admins and Managers" },
    ],
  },
} as const;

// ── Feature cards ─────────────────────────────────────────────────────────

export const FEATURES_SECTION: SectionCopy = {
  eyebrow: "Comprehensive suite",
  icon: LayoutGrid,
  title: "Everything in one workspace.",
  intro: "Every detail organized with elegance, administrative rigor, and ceremonial clarity.",
};

export type FeaturePreview =
  | { kind: "list"; items: readonly { label: string; value: string; emphasis?: boolean }[] }
  | { kind: "task"; title: string; meta: string }
  | { kind: "person"; name: string; meta?: string; badge: string; avatar?: string }
  | { kind: "link"; text: string };

export interface FeatureCard {
  feature: ProductFeature;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Small category chip shown on phones (live features only). */
  tag: string;
  preview: FeaturePreview;
}

export const FEATURE_CARDS: readonly FeatureCard[] = [
  {
    feature: "events",
    title: "Events",
    description: "Every ceremony from Roka to Reception with its date, time, venue and dress code.",
    icon: CalendarDays,
    tag: "Core suite",
    preview: {
      kind: "list",
      items: [
        { label: "Haldi Rasam", value: "10:00 AM" },
        { label: "Sangeet Night", value: "7:30 PM" },
      ],
    },
  },
  {
    feature: "tasks",
    title: "Tasks",
    description: "Assign tasks to family members with a due date, priority and status.",
    icon: ClipboardList,
    tag: "Coordination",
    preview: { kind: "task", title: "Finalize dhol player", meta: "Assigned to Rohan" },
  },
  {
    feature: "guests",
    title: "Guests & RSVP",
    description:
      "One invitation per family with a party limit, invited only to the ceremonies you choose.",
    icon: UserCheck,
    tag: "No app needed",
    preview: { kind: "person", name: "Rajesh Sharma", meta: "Party of 4", badge: "Attending" },
  },
  {
    feature: "familyMembers",
    title: "Family Members",
    description: "Admins and Managers plan together; only Admins manage the family team.",
    icon: UsersRound,
    tag: "Roles",
    preview: { kind: "person", name: "Vikram (Father)", badge: "Admin", avatar: "V" },
  },
  {
    feature: "organiserGallery",
    title: "Photo Gallery",
    description: "A private gallery organised by ceremony.",
    icon: Images,
    tag: "Private",
    preview: { kind: "list", items: [{ label: "Haldi & Mehendi", value: "240 photos" }] },
  },
  {
    feature: "expenses",
    title: "Expense Tracker",
    description: "Record what you've spent by category, ceremony and vendor, with a running total.",
    icon: Wallet,
    tag: "Expenses",
    preview: {
      kind: "list",
      items: [{ label: "Total spent", value: "₹17,42,500", emphasis: true }],
    },
  },
  {
    feature: "vendors",
    title: "My Vendors",
    description: "Save your booked vendors and discover trusted ones nearby.",
    icon: Store,
    tag: "Vendors",
    preview: { kind: "list", items: [{ label: "Devi Sound & Lights", value: "DJ · Sangeet" }] },
  },
  {
    feature: "website",
    title: "Wedding Website",
    description: "Pick a theme and share one link with your events, gallery and livestream.",
    icon: Globe,
    tag: "Website",
    preview: { kind: "link", text: "makemymarriage.com/w/romeo-juliet" },
  },
];

// ── Family team ───────────────────────────────────────────────────────────

export const FAMILY = {
  eyebrow: "Multi-generational coordination",
  icon: UsersRound,
  titleLines: ["Everyone helps.", "Nobody gets lost."],
  intro:
    "Everyone on your family team sees the same plan. Admins invite and manage members; Managers help run events, tasks, guests, expenses and photos.",
  callout: {
    title: "Simple enough for parents",
    text: "Adding a guest, completing a task, recording an expense or checking an RSVP takes just a couple of taps.",
  },
  team: {
    title: "Family Coordination Team",
    subtitle: "4 family members · Admins and Managers",
    invite: "Invite member",
    members: [
      { initials: "VM", name: "Vikram Malhotra", relation: "Father of the Groom", role: "ADMIN" },
      { initials: "SM", name: "Sunita Malhotra", relation: "Mother of the Groom", role: "MANAGER" },
      { initials: "RM", name: "Romeo Montague", relation: "Groom", role: "ADMIN" },
      { initials: "RM", name: "Rohan Malhotra", relation: "Brother of the Groom", role: "MANAGER" },
    ] satisfies readonly { initials: string; name: string; relation: string; role: MemberRole }[],
  },
} as const;

// ── Ceremonies ────────────────────────────────────────────────────────────

export const CEREMONIES_SECTION: SectionCopy = {
  eyebrow: "Ritual sequence",
  icon: Milestone,
  title: "Many ceremonies, one plan.",
  intro:
    "Indian weddings are a journey of multiple sacred milestones. Coordinate each custom schedule, distinct dress code, and guest group with individual precision.",
};

export const CEREMONIES = [
  {
    name: "Roka",
    moment: "Ritual",
    date: "12 Nov 2026",
    day: "12 Nov",
    time: "11:00 AM",
    venue: "Family home, Delhi",
    dressCode: "Traditional",
  },
  {
    name: "Mehendi",
    moment: "Ceremony",
    date: "12 Feb 2027",
    day: "12 Feb",
    time: "3:00 PM",
    venue: "The Forest Resort",
    dressCode: "Pastels",
  },
  {
    name: "Haldi",
    moment: "Morning",
    date: "13 Feb 2027",
    day: "13 Feb",
    time: "10:00 AM",
    venue: "Courtyard Lawn",
    dressCode: "Yellow",
  },
  {
    name: "Sangeet",
    moment: "Evening",
    date: "13 Feb 2027",
    day: "13 Feb",
    time: "7:30 PM",
    venue: "Grand Ballroom",
    dressCode: "Glamour",
  },
  {
    name: "Cocktail",
    moment: "Night",
    date: "13 Feb 2027",
    day: "13 Feb",
    time: "10:30 PM",
    venue: "Terrace Lounge",
    dressCode: "Indo-Western",
  },
  {
    name: "Wedding",
    moment: "Main",
    date: "14 Feb 2027",
    day: "14 Feb",
    time: "4:00 PM",
    venue: "Mandap by the River",
    dressCode: "Royal Festive",
  },
  {
    name: "Reception",
    moment: "Finale",
    date: "15 Feb 2027",
    day: "15 Feb",
    time: "7:00 PM",
    venue: "Banquet Hall",
    dressCode: "Formal",
  },
] as const;

/** One invitation covers chosen ceremonies; the RSVP is for the whole invitation (API_DESIGN §51). */
export const INVITATION_MAPPING = {
  eyebrow: "Granular invitation mapping",
  guest: "Rajesh Sharma (Party of 4)",
  rsvp: "RSVP: Attending · 4 of 4",
  limit: "Up to 4 guests",
  invitations: [
    { ceremony: "Mehendi", invited: false },
    { ceremony: "Cocktail", invited: true },
    { ceremony: "Wedding", invited: true },
    { ceremony: "Reception", invited: true },
  ],
} as const;

// ── Guest experience ──────────────────────────────────────────────────────

export const GUEST_EXPERIENCE = {
  eyebrow: "Frictionless guest experience",
  icon: LinkIcon,
  title: "One link. One tap. No account.",
  intro:
    "Your guests never download an app, create a password, or remember logins. Simply share a secure invitation link via WhatsApp.",
  steps: [
    {
      title: "Personal link",
      text: "Every guest gets a private invitation link. Share it on WhatsApp in one tap, or send it by email.",
    },
    {
      title: "RSVP with headcount",
      text: "Guests answer yes or no and how many are coming, up to the limit you set. They can change it later from the same link.",
    },
    {
      title: "See every response",
      text: "Replies land in your RSVP summary: who's attending and how many people are coming.",
    },
  ],
  share: "Share on WhatsApp",
  invitation: {
    label: "Wedding of",
    compactLabel: "Wedding invitation",
    place: "Dehradun · Feb 2027",
    date: "14 Feb 2027",
    welcome: "Welcome Rajesh Ji & Family",
    invitedTo: "You are warmly invited to 3 ceremonies",
    ceremonies: ["Cocktail · 13 Feb", "Wedding · 14 Feb", "Reception · 15 Feb"],
  },
  rsvpForm: {
    title: "Confirm your attendance",
    cap: "Party cap: up to 4 guests",
    question: "Will you attend?",
    yes: "Yes",
    no: "No",
    headcountLabel: "Attending headcount",
    headcount: "4 Guests",
    submit: "Confirm my RSVP",
    footnote: "No login needed · Change anytime",
  },
} as const;

// ── Gallery ───────────────────────────────────────────────────────────────

export const GALLERY = {
  eyebrow: "Ceremony media vault",
  icon: Camera,
  title: "Every photo, from every guest, in one private gallery.",
  intro:
    "No more compressed WhatsApp media or missing cloud drive links. Gather ceremonial memories directly organized by function.",
  organiserLive: "Organiser gallery: live today",
  guestUploads: "Guest uploads via QR code",
  albums: [
    { name: "Mehendi", photos: "142 photos" },
    { name: "Haldi Rituals", photos: "98 photos" },
    { name: "Sangeet Night", photos: "310 photos" },
    { name: "Varmala & Pheras", photos: "215 photos" },
  ],
  qr: {
    label: "Table stand",
    title: "Share the Memories",
    text: "Scan to view and upload photos from Romeo & Juliet's wedding.",
    badge: "Printable QR code",
    meta: "Direct camera upload · No app required",
    action: "Download QR",
  },
} as const;

// ── Wedding website ───────────────────────────────────────────────────────

export const WEBSITE = {
  eyebrow: "Digital guest portal",
  icon: PanelsTopLeft,
  title: "A beautiful website, without the design work.",
  intro:
    "Pick one of three themes and publish a simple website with your couple details, events, dress codes, gallery and livestream.",
  // Theme names come from WEBSITE_THEME_LABELS so the page matches the app (PRD §9.19).
  themes: [
    {
      theme: "CLASSIC",
      initials: "CI",
      sample: "Romeo & Juliet",
      style: "Classic Indian palette",
      description: "Traditional, decorative wedding aesthetic.",
    },
    {
      theme: "MINIMAL",
      initials: "ME",
      sample: "R & J · 2027",
      style: "Minimal whitespace",
      description: "Clean typography and an elegant layout.",
    },
    {
      theme: "MODERN",
      initials: "MC",
      sample: "The Malhotra Union",
      style: "Contemporary colour",
      description: "Contemporary, colourful design.",
    },
  ] satisfies readonly {
    theme: WebsiteTheme;
    initials: string;
    sample: string;
    style: string;
    description: string;
  }[],
  livestream: {
    title: "YouTube livestream",
    text: "Add your YouTube Live link and it plays on your wedding website for family abroad.",
  },
} as const;

// ── Privacy ───────────────────────────────────────────────────────────────

export const PRIVACY = {
  eyebrow: "Uncompromising security",
  icon: Shield,
  title: "Designed for family privacy.",
  intro: "Your guest list, family details and photos stay private to your wedding.",
  points: [
    {
      icon: EyeOff,
      title: "Private by default",
      text: "Only your family team can see your wedding workspace. Invitation and gallery links are never indexed by search engines.",
    },
    {
      icon: Shield,
      title: "Your data stays yours",
      text: "Your guest list and photos are used only to run your wedding.",
    },
    {
      icon: KeyRound,
      title: "Unguessable guest links",
      text: "Each invitation has its own private link that can't be guessed.",
    },
    {
      icon: RectangleEllipsis,
      title: "No guest passwords",
      text: "Guests never create an account or remember a password.",
    },
  ],
} as const;

// ── How it works ──────────────────────────────────────────────────────────

export const HOW_IT_WORKS = {
  eyebrow: "Methodology",
  icon: Workflow,
  title: "How it works.",
  intro:
    "Four clear stages to organize every tradition and welcome your extended family with confidence.",
  steps: [
    {
      title: "Create your wedding",
      text: "Enter the couple's names, wedding date and city.",
      note: "Takes about a minute",
    },
    {
      title: "Invite your family",
      text: "Add parents and siblings as Admins or Managers so everyone plans together.",
    },
    {
      title: "Add events & guests",
      text: "Add each ceremony, add your guests and choose which ceremonies each one is invited to.",
    },
    {
      title: "Celebrate together",
      text: "Share invitations on WhatsApp or email, collect RSVPs and keep every ceremony on track.",
      note: "Everyone on the same page",
    },
  ],
} as const;

// ── FAQ ───────────────────────────────────────────────────────────────────

export const FAQ = {
  eyebrow: "Clarifications",
  icon: CircleHelp,
  title: "Frequently asked questions.",
  intro: "Everything you need to know about setting up your workspace and inviting guests.",
  items: [
    {
      question: "Do guests need an account or an app?",
      answer:
        "No. Each guest opens their own private link to view their invitation and RSVP. Nothing to download, no password.",
    },
    {
      question: "Who can manage our wedding?",
      answer:
        "Admins and Managers see and plan the same wedding. Only Admins can invite, remove or change the role of family members.",
    },
    {
      question: "Can I invite guests to only some events?",
      answer:
        "Yes. Choose which ceremonies each guest is invited to; their invitation shows only those events. Each invitation has one RSVP with a headcount.",
    },
    {
      question: "Is our wedding data private?",
      answer:
        "Yes. Only the family members you invite can see your wedding workspace. Each guest sees only their own invitation, and invitation and gallery links are never indexed by search engines.",
    },
  ],
  /** The answer is generated from ./feature-availability.ts. */
  upcomingQuestion: "What features are coming next?",
} as const;

// ── Closing call to action and footer ─────────────────────────────────────

export const FINAL_CTA = {
  eyebrow: "Begin today",
  icon: Heart,
  title: "Start planning your wedding.",
  text: "Bring your family together in one calm, dedicated workspace and coordinate every sacred ceremony with confidence.",
  primary: "Start planning",
  secondary: "Explore features",
} as const;

export const FOOTER = {
  description: "The wedding workspace for Indian families.",
  columns: [
    { title: "Product", links: NAV_LINKS },
    {
      title: "Account",
      links: [
        { label: "Sign in", href: ROUTES.signIn },
        { label: "Start planning", href: ROUTES.signUp },
      ],
    },
  ],
  // Static on purpose: reading the clock would make this page request-time under Cache Components.
  copyright: "© 2026 Make My Marriage. Crafted with generational care.",
} as const;
