/**
 * The complete API surface: API_DESIGN §106 (endpoint inventory) + §83 cover
 * uploads (route tree §105) + GET /api/photos/:photoId/download (2026-09-18
 * notes) + GET /api/health (scaffold only). docs/CODEBASE_ARCHITECTURE.md
 * renders the same table. `tests/architecture/api-routes.test.ts` asserts that
 * every entry exists with exactly these methods and auth levels.
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type AuthLevel = "public" | "user" | "member" | "admin" | "internal";

export const PHASES = {
  P1: "Phase 1: Foundation",
  P2: "Phase 2: Planning",
  P3: "Phase 3: Guests",
  P4: "Phase 4: Financial & Vendors",
  P5: "Phase 5: Wedding Experience",
  P6: "Phase 6: Memories",
  SCAFFOLD: "Scaffold",
} as const;

export type Phase = (typeof PHASES)[keyof typeof PHASES];

export interface EndpointSpec {
  method: HttpMethod;
  /** App Router path, e.g. "/api/tasks/[taskId]". */
  path: string;
  auth: AuthLevel;
  phase: Phase;
  /** Doc section that specifies the behaviour. */
  doc: string;
  /** Works today (everything else answers 501 NOT_IMPLEMENTED once auth passes). */
  implemented?: boolean;
}

const { P1, P2, P3, P4, P5, P6, SCAFFOLD } = PHASES;

export const API_INVENTORY: readonly EndpointSpec[] = [
  // ── Scaffold ───────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/health",
    auth: "public",
    phase: SCAFFOLD,
    doc: "scaffold",
    implemented: true,
  },

  // ── Authentication (API §11–16) ────────────────────────────────────────────
  { method: "POST", path: "/api/auth/signup", auth: "public", phase: P1, doc: "API §11" },
  { method: "POST", path: "/api/auth/login", auth: "public", phase: P1, doc: "API §12" },
  { method: "POST", path: "/api/auth/logout", auth: "user", phase: P1, doc: "API §13" },
  { method: "GET", path: "/api/auth/me", auth: "user", phase: P1, doc: "API §14" },
  { method: "POST", path: "/api/auth/forgot-password", auth: "public", phase: P1, doc: "API §15" },
  { method: "POST", path: "/api/auth/reset-password", auth: "public", phase: P1, doc: "API §16" },

  // ── Wedding + dashboard (API §17–20) ───────────────────────────────────────
  { method: "POST", path: "/api/wedding", auth: "user", phase: P1, doc: "API §17" },
  { method: "GET", path: "/api/wedding", auth: "member", phase: P1, doc: "API §18" },
  { method: "PATCH", path: "/api/wedding", auth: "member", phase: P1, doc: "API §19" },
  { method: "GET", path: "/api/dashboard", auth: "member", phase: P1, doc: "API §20" },

  // ── Members (API §21–28) ───────────────────────────────────────────────────
  { method: "GET", path: "/api/members", auth: "member", phase: P1, doc: "API §21" },
  {
    method: "PATCH",
    path: "/api/members/[membershipId]",
    auth: "admin",
    phase: P1,
    doc: "API §27",
  },
  {
    method: "DELETE",
    path: "/api/members/[membershipId]",
    auth: "admin",
    phase: P1,
    doc: "API §28",
  },
  { method: "POST", path: "/api/members/invitations", auth: "admin", phase: P1, doc: "API §22" },
  { method: "GET", path: "/api/members/invitations", auth: "admin", phase: P1, doc: "API §23" },
  {
    method: "DELETE",
    path: "/api/members/invitations/[invitationId]",
    auth: "admin",
    phase: P1,
    doc: "API §24",
  },
  {
    method: "GET",
    path: "/api/public/member-invitations/[token]",
    auth: "public",
    phase: P1,
    doc: "API §25",
  },
  {
    method: "POST",
    path: "/api/member-invitations/[token]/accept",
    auth: "user",
    phase: P1,
    doc: "API §26",
  },

  // ── Events (API §29–33) ────────────────────────────────────────────────────
  { method: "GET", path: "/api/events", auth: "member", phase: P2, doc: "API §29" },
  { method: "POST", path: "/api/events", auth: "member", phase: P2, doc: "API §30" },
  { method: "GET", path: "/api/events/[eventId]", auth: "member", phase: P2, doc: "API §31" },
  { method: "PATCH", path: "/api/events/[eventId]", auth: "member", phase: P2, doc: "API §32" },
  { method: "DELETE", path: "/api/events/[eventId]", auth: "member", phase: P2, doc: "API §33" },

  // ── Tasks (API §34–38) ─────────────────────────────────────────────────────
  { method: "GET", path: "/api/tasks", auth: "member", phase: P2, doc: "API §34" },
  { method: "POST", path: "/api/tasks", auth: "member", phase: P2, doc: "API §35" },
  { method: "GET", path: "/api/tasks/[taskId]", auth: "member", phase: P2, doc: "API §36" },
  { method: "PATCH", path: "/api/tasks/[taskId]", auth: "member", phase: P2, doc: "API §37" },
  { method: "DELETE", path: "/api/tasks/[taskId]", auth: "member", phase: P2, doc: "API §38" },

  // ── Guests (API §39–49, §52) ───────────────────────────────────────────────
  { method: "GET", path: "/api/guests", auth: "member", phase: P3, doc: "API §39" },
  { method: "POST", path: "/api/guests", auth: "member", phase: P3, doc: "API §40" },
  { method: "GET", path: "/api/guests/rsvp-summary", auth: "member", phase: P3, doc: "API §52" },
  {
    method: "POST",
    path: "/api/guests/actions/send-invitations",
    auth: "member",
    phase: P3,
    doc: "API §47",
  },
  {
    method: "POST",
    path: "/api/guests/actions/send-reminders",
    auth: "member",
    phase: P3,
    doc: "API §49",
  },
  { method: "GET", path: "/api/guests/[guestId]", auth: "member", phase: P3, doc: "API §41" },
  { method: "PATCH", path: "/api/guests/[guestId]", auth: "member", phase: P3, doc: "API §42" },
  { method: "DELETE", path: "/api/guests/[guestId]", auth: "member", phase: P3, doc: "API §43" },
  {
    method: "GET",
    path: "/api/guests/[guestId]/invitation-link",
    auth: "member",
    phase: P3,
    doc: "API §45",
  },
  {
    method: "POST",
    path: "/api/guests/[guestId]/send-invitation",
    auth: "member",
    phase: P3,
    doc: "API §46",
  },
  {
    method: "POST",
    path: "/api/guests/[guestId]/send-reminder",
    auth: "member",
    phase: P3,
    doc: "API §48",
  },

  // ── Public guest invitation (API §50–51) ───────────────────────────────────
  {
    method: "GET",
    path: "/api/public/invitations/[token]",
    auth: "public",
    phase: P3,
    doc: "API §50",
  },
  {
    method: "POST",
    path: "/api/public/invitations/[token]/rsvp",
    auth: "public",
    phase: P3,
    doc: "API §51",
  },

  // ── Email batches + internal worker (API §85–87) ───────────────────────────
  {
    method: "GET",
    path: "/api/email-batches/[batchId]",
    auth: "member",
    phase: P3,
    doc: "API §85",
  },
  {
    method: "POST",
    path: "/api/email-batches/[batchId]/retry-failed",
    auth: "member",
    phase: P3,
    doc: "API §86",
  },
  {
    method: "GET",
    path: "/api/internal/jobs/email",
    auth: "internal",
    phase: P3,
    doc: "API §87 (Vercel Cron uses GET)",
    implemented: true,
  },
  {
    method: "POST",
    path: "/api/internal/jobs/email",
    auth: "internal",
    phase: P3,
    doc: "API §87",
    implemented: true,
  },

  // ── Expenses (API §53–58) ──────────────────────────────────────────────────
  { method: "GET", path: "/api/expenses", auth: "member", phase: P4, doc: "API §53" },
  { method: "POST", path: "/api/expenses", auth: "member", phase: P4, doc: "API §54" },
  { method: "GET", path: "/api/expenses/summary", auth: "member", phase: P4, doc: "API §55" },
  { method: "GET", path: "/api/expenses/[expenseId]", auth: "member", phase: P4, doc: "API §56" },
  { method: "PATCH", path: "/api/expenses/[expenseId]", auth: "member", phase: P4, doc: "API §57" },
  {
    method: "DELETE",
    path: "/api/expenses/[expenseId]",
    auth: "member",
    phase: P4,
    doc: "API §58",
  },

  // ── Vendors + discovery (API §59–66) ───────────────────────────────────────
  { method: "GET", path: "/api/vendors", auth: "member", phase: P4, doc: "API §59" },
  { method: "POST", path: "/api/vendors", auth: "member", phase: P4, doc: "API §60" },
  { method: "POST", path: "/api/vendors/from-place", auth: "member", phase: P4, doc: "API §61" },
  { method: "GET", path: "/api/vendors/[vendorId]", auth: "member", phase: P4, doc: "API §62" },
  { method: "PATCH", path: "/api/vendors/[vendorId]", auth: "member", phase: P4, doc: "API §63" },
  { method: "DELETE", path: "/api/vendors/[vendorId]", auth: "member", phase: P4, doc: "API §64" },
  {
    method: "GET",
    path: "/api/vendor-discovery/search",
    auth: "member",
    phase: P4,
    doc: "API §65–66",
  },

  // ── Website, livestream, covers (API §67–72, §83) ──────────────────────────
  { method: "GET", path: "/api/wedding/website", auth: "member", phase: P5, doc: "API §67" },
  { method: "PATCH", path: "/api/wedding/website", auth: "member", phase: P5, doc: "API §68" },
  { method: "GET", path: "/api/public/weddings/[slug]", auth: "public", phase: P5, doc: "API §69" },
  { method: "GET", path: "/api/wedding/livestream", auth: "member", phase: P5, doc: "API §70" },
  {
    method: "PATCH",
    path: "/api/wedding/livestream",
    auth: "member",
    phase: P5,
    doc: "API §71–72",
  },
  {
    method: "POST",
    path: "/api/wedding/cover/upload-url",
    auth: "member",
    phase: P5,
    doc: "API §83",
  },
  {
    method: "POST",
    path: "/api/events/[eventId]/cover/upload-url",
    auth: "member",
    phase: P5,
    doc: "API §83",
  },

  // ── Gallery + photos (API §73–82, 2026-09-18 notes) ────────────────────────
  { method: "GET", path: "/api/gallery/settings", auth: "member", phase: P6, doc: "API §73" },
  { method: "PATCH", path: "/api/gallery/settings", auth: "member", phase: P6, doc: "API §74" },
  { method: "GET", path: "/api/gallery/qr", auth: "member", phase: P6, doc: "API §84" },
  { method: "GET", path: "/api/photos", auth: "member", phase: P6, doc: "API §75" },
  { method: "POST", path: "/api/photos", auth: "member", phase: P6, doc: "API §77" },
  { method: "POST", path: "/api/photos/upload-url", auth: "member", phase: P6, doc: "API §76" },
  { method: "DELETE", path: "/api/photos/[photoId]", auth: "member", phase: P6, doc: "API §78" },
  {
    method: "GET",
    path: "/api/photos/[photoId]/download",
    auth: "member",
    phase: P6,
    doc: "API 2026-09-18 notes",
  },
  {
    method: "GET",
    path: "/api/public/galleries/[token]",
    auth: "public",
    phase: P6,
    doc: "API §80",
  },
  {
    method: "GET",
    path: "/api/public/galleries/[token]/photos",
    auth: "public",
    phase: P6,
    doc: "API §79",
  },
  {
    method: "POST",
    path: "/api/public/galleries/[token]/photos",
    auth: "public",
    phase: P6,
    doc: "API §82",
  },
  {
    method: "POST",
    path: "/api/public/galleries/[token]/upload-url",
    auth: "public",
    phase: P6,
    doc: "API §81",
  },
];
