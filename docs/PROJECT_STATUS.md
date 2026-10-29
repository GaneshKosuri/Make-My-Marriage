# Project Status — Make My Marriage

**Last updated:** 2026-10-29
**Current phase:** Phase 1 — Foundation (PRD §16): all features built; wrap-up items in §3
**Next up:** Phase 2 — Planning: Events (API §29–33), then Tasks (API §34–38)

This file tracks what has been built and what comes next. Update it whenever a feature lands or new
work starts: move items between the tables, add a row to the change log and refresh the header.
Scope comes from `docs/PRD.md`; how things are built comes from `docs/CODEBASE_ARCHITECTURE.md`.

Status key: ✅ Done · 🚧 In progress · ⏳ Not started (scaffold stub only)

---

## 1. Completed

| Area | What was delivered | Commits |
| --- | --- | --- |
| Repository setup | Product docs (PRD, system, database and API design), `brand/` and `prompts/` folders | `eed0466`, `69d3e89` |
| Toolchain | Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Tailwind 4, shadcn/ui, ESLint 9, Prettier | `3386f02` |
| Server infrastructure | `route()` handler wrapper, errors, logging, config, MongoDB connection and tenant-guard plugin, tokens, rate limits, email/storage service ports, composition root | `6ed83d8` |
| Domain modules | Mongoose models and module skeletons (constants, schemas, types, repository, service, mapper) for every bounded context | `0ed772e` |
| REST API map | All 78 endpoints wired as `route()` stubs that answer `501 NOT_IMPLEMENTED` with their phase (health and the email cron are live) | `d98e522` |
| App shell | Pages, layouts, `src/proxy.ts`, guarded `/app` dashboard shell | `bd7c19f` |
| Test harness | Vitest unit + integration (in-memory MongoDB replica set), architecture tests, security tests, Playwright smoke | `3ee2e4c` |
| Architecture docs | `docs/CODEBASE_ARCHITECTURE.md`, `CLAUDE.md`, `README.md` | `683b894` |
| Brand | Logo fixes | `a1b7fed` |
| Public home page | Desktop and mobile home page built from the Stitch design: brand theme and type scale, Manrope/Playfair fonts, all landing sections, mobile menu, FAQ, "Coming soon" badges driven by `src/features/marketing/feature-availability.ts`, smooth in-page scrolling | `b05c8f9`, `b233ecb` |

## 2. Roadmap by phase (PRD §16)

### Phase 1 — Foundation ✅

| Feature | Status | Notes |
| --- | --- | --- |
| Public home page | ✅ | See Completed |
| Authentication API (6 endpoints) | ✅ | Signup, login, logout, me, forgot and reset password; passwords ≥ 8 characters, reset links last 60 minutes and revoke all sessions |
| Authentication screens | ✅ | Sign in, sign up, forgot password ("Check your email"), reset password (expired / used / updated), desktop + mobile, from the Stitch auth designs |
| Wedding creation (create wedding + ADMIN membership) | ✅ | `POST /api/wedding` (one transaction, unique web address, gallery token, one wedding per user) and the Create Wedding screen with live preview, time zone, sign out and the "Invited by family?" note |
| Wedding members (invite, accept, roles) | ✅ | All 8 endpoints (list, invite, list and revoke invitations, public invite preview, accept, change role, remove) with the last-Admin rule and emailed `/join/[token]` links valid 7 days. `/join/[token]`: sign up or sign in with the invited email locked, then join. Settings → Wedding Members: member list, invite dialog, role changes, remove and leave (with confirmation), pending invitations with resend and revoke; read-only for Managers. Settings tabs (Details, Members). Dashboard style, desktop + mobile |
| Dashboard | ✅ | `GET /api/dashboard` and `GET /api/wedding`; dashboard screen (countdown, six summary cards, upcoming events and tasks, RSVP overview, "Get started" checklist, empty and loading states) and the restyled app shell (sidebar, top bar with "+ Add", phone bottom bar with "More" and "+" sheets), desktop + mobile, from the Stitch dashboard designs |
| Wedding settings (Wedding Details) | ✅ | `PATCH /api/wedding` for Admins and Managers: any subset of names, title, description, date, time zone and place; the web address never changes; blank title or description clears it; a changed date must be today or later in the wedding's time zone. Settings → Wedding Details form in the dashboard style, sending only changed fields, with the fixed website address shown. Cover photo waits for Phase 5 |

### Phase 2 — Planning ⏳

| Feature | Status | Notes |
| --- | --- | --- |
| Events | ⏳ | |
| Tasks | ⏳ | |

### Phase 3 — Guests ⏳

| Feature | Status | Notes |
| --- | --- | --- |
| Guest management | ⏳ | |
| Invitations | ⏳ | |
| RSVP | ⏳ | |
| Email (jobs + cron worker) | ⏳ | Cron endpoint is live; sending flows are not |
| WhatsApp sharing | ⏳ | |

### Phase 4 — Financial and Vendors ⏳

| Feature | Status | Notes |
| --- | --- | --- |
| Expense tracker | ⏳ | |
| My Vendors | ⏳ | |
| Vendor discovery | ⏳ | |

### Phase 5 — Wedding Experience ⏳

| Feature | Status | Notes |
| --- | --- | --- |
| Wedding website | ⏳ | |
| Themes | ⏳ | |
| YouTube livestream | ⏳ | |

### Phase 6 — Memories ⏳

| Feature | Status | Notes |
| --- | --- | --- |
| Gallery and albums | ⏳ | |
| Guest photo uploads | ⏳ | |
| Private sharing and QR code | ⏳ | |

### Phase 7 — Production Readiness ⏳

Error handling, security review, responsive design, performance, testing, analytics, deployment,
monitoring.

## 3. Open items

- **Home page "Coming soon" badges.** `feature-availability.ts` marks events, tasks, guests, family
  members and the organiser gallery as `live`; family members is now built, the others are not yet. Flip each one to
  match reality before the site goes public.
- **Privacy wording.** Confirm the home page line "Your data stays yours: used only to run your
  wedding".
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** still lists the six auth endpoints as
  "501 stub". That file is outside the editable set; `tests/architecture/api-inventory.ts` marks them
  `implemented: true`.
- **Per-email limit on forgot-password.** Only a per-IP limit exists today, so one IP can send up to
  5 reset emails per 15 minutes to the same address. Revisit if abuse appears.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** also lists the eight member endpoints as
  "501 stub"; the inventory marks them implemented.
- **Removing a member and their tasks (Phase 2).** `removeMember` deletes the membership only. When
  tasks land, unassign the removed member's tasks (`assignedMembershipId`); a TODO marks the spot.
- **Member rate limits are placeholders.** Invites 30 per wedding per hour, the public invite preview
  60 per IP per minute, accepting 20 per user per 15 minutes. Tune with real traffic.
- **Members and Wedding Details screens not yet clicked through against a database.** The APIs are
  covered by integration tests and the screens by component tests; only the invalid-link page was
  checked in the browser. A full run (invite
  email → sign up → dashboard) needs `npm run db:dev` and a `.env.local` without `RESEND_API_KEY`, so no
  real email is sent.
- **Restart `next dev` after this change.** The identity ports are registered once at startup, so a
  running dev server keeps showing the header without the wedding's place until it restarts.
- **Dashboard links lead to placeholders.** Every card, "+ Add" item and checklist step links to the
  page where that record is added (events, tasks, guests, …). Those pages are placeholders until their
  phase lands.
- **RSVP reminder and WhatsApp buttons** from the dashboard design are left out until Phase 3 (guest
  invitations), so the RSVP overview shows counts and a link to RSVP status only.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** also still lists `GET /api/wedding` and
  `GET /api/dashboard` as "501 stub"; the inventory marks them implemented. The same is true of `PATCH /api/wedding`.
- **Database name.** `.env.local` points at the Atlas cluster without a database name, so data lands in
  `test`. Add `/make-my-marriage-dev` before `?` in `MONGODB_URI` to give it its own database.
- **Deleting a wedding (when it is built).** The "already has a wedding" check in `createWedding` counts a
  membership even when its wedding is soft-deleted, but the dashboard guard treats that user as having no
  wedding and sends them to Create Wedding, so they would be stuck. Deleting a wedding must also remove
  (or release) its memberships. Found in the 2026-10-17 code review.
- **Three-way web-address race.** If three people create a wedding with the same names and date at the
  same instant, the third can get a 500 instead of the next free address (`createWedding` retries a
  taken address only twice). Very unlikely; harden if it ever shows up. Found in the 2026-10-17 code review.
- **Wedding location is replaced as a whole.** `PATCH /api/wedding` with `location` stores exactly what
  was sent, so a form that sends only city, state and country clears `formattedAddress`, coordinates and
  `googlePlaceId`. Harmless today (nothing sets them); merge or resend those fields when the place picker
  is built. Found in the 2026-10-29 code review.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** does not list
  `POST /api/members/invitations/:id/resend` (added 2026-10-29; the inventory has it).
- **Legal pages.** Privacy policy and terms are needed before production. Until they exist, the home
  footer, the auth footer and the sign-up form leave out the "Privacy · Terms" links and the
  "By continuing you agree…" line shown in the designs.

## 4. Decisions

| Date | Decision |
| --- | --- |
| 2026-10-10 | Passwords need at least 8 characters; reset links expire after 60 minutes |
| 2026-10-10 | Couple names default to groom first ("Romeo & Juliet"), and the website address follows the same order (`romeo-juliet-14022027`). The form still asks for the bride's name first. Resolves CODEBASE_ARCHITECTURE open decision 21 |
| 2026-10-10 | Wedding date must be today or later, judged in the wedding's time zone |
| 2026-10-10 | Country is optional and prefilled with India; time zone defaults to India (IST) and can be changed |
| 2026-10-10 | Cover image is left out of Create Wedding until uploads exist (Phase 5) |
| 2026-10-17 | `GET /api/dashboard` adds three fields to API_DESIGN §20: `rsvps.peopleAttending` (sum of `attendingCount` on attending guests, per SYSTEM_DESIGN §23), `invitationsSent` and `members` (for the "Get started" checklist). `upcomingEvents` are full event DTOs (venue, dress code) |
| 2026-10-17 | Upcoming events include events still in progress; upcoming tasks are incomplete, nearest due date first, undated last. The RSVPs card counts replies (attending + not attending) with "N still to reply" |
| 2026-10-17 | The dashboard reads its numbers on the client (`useDashboard`, TanStack Query) so later mutations can refresh it by invalidating `dashboardKeys.all` |
| 2026-10-17 | "Get started" has five steps (event, task, guests, family member, invitations), leads the page for a new wedding and disappears once all are done. Managers see the family-member step without a link |
| 2026-10-29 | `/join/[token]` will show the sign-in and sign-up forms itself and accept the invitation once signed in, instead of adding `?next=` to /login (binding decision 12 only allows `/app` targets) |
| 2026-10-29 | Managers see Wedding Members read-only (API §21 lets them list members); only Admins invite, change roles, remove and see pending invitations |
| 2026-10-29 | If the invitation email cannot be sent, the invitation is revoked (kept, not deleted) and the Admin gets `EXTERNAL_SERVICE_ERROR` (503) to try again; the raw link exists nowhere else |
| 2026-10-29 | "Resend" is its own endpoint, `POST /api/members/invitations/:id/resend` (Admin, same rate limit as inviting; not in API_DESIGN). It gives the same pending invitation a new token and 7-day expiry and emails it; if the email fails the old token is put back, so the invitee's link keeps working. Replaces revoke-then-invite from the browser, which lost the link when the second request failed |
| 2026-10-29 | The last-Admin rule runs without a transaction (binding rule: transactions only for create wedding and accept): check, write, then check again and undo if two Admins demoted or removed each other at the same moment (`LAST_ADMIN`, 409) |
| 2026-10-29 | The public invite preview answers `NOT_FOUND` for unknown, revoked, accepted and expired links alike; accepting still returns the specific API §26 codes (`INVALID_TOKEN` 400, `TOKEN_EXPIRED` 410, `INVITATION_ALREADY_ACCEPTED` 409, `INVITATION_EMAIL_MISMATCH` 403, `ALREADY_HAS_WEDDING` 409). `requiresLogin` is always true |
| 2026-10-29 | Inviting someone already in the wedding, or an email with an invitation still waiting, is `CONFLICT` (409) with the reason under `details.email`. An expired pending invitation for that email is revoked and replaced. `GET /api/members/invitations` lists pending, unexpired invitations only |
| 2026-10-29 | An Admin may change their own role or remove themselves while another Admin remains. Managers cannot leave a wedding in V1 (the endpoint is Admin only); confirmed after testing: their own row says to ask an Admin to remove them, and the join page explains the same |
| 2026-10-29 | `/join/[token]` has its own compact sign-up and sign-in forms (invited email locked, "Create an account" first) built from the shared form controls, rather than reusing the /login and /signup forms with an override. Signing in with an account that already has a wedding does not try to accept |
| 2026-10-29 | Wedding Members is in every member's navigation (no longer Admin only); Managers get the read-only list. Changing someone else's role is one click; removing, leaving and stepping down yourself ask first. The only Admin gets no demote or leave controls. Leaving sends you to Create Wedding |
| 2026-10-29 | Wedding details have no version check (decision 8 covers events, tasks and guests only). The form sends only changed fields, and the place as a whole, so two people editing different fields don't overwrite each other |
| 2026-10-29 | A changed wedding date must be today or later in the wedding's time zone (the new one when it changes too); resending the unchanged date is always accepted, so details stay editable after the wedding day |

## 5. Change log

| Date | Change |
| --- | --- |
| 2026-10-07 | Product docs added |
| 2026-10-08 | Toolchain, infrastructure, modules, API stubs, app shell, test harness and architecture docs (scaffold complete) |
| 2026-10-09 | Public home page (desktop + mobile) with smooth in-page scrolling; project status file started |
| 2026-10-10 | Auth screens reviewed against the home page and PRD (Stitch fix prompt issued); authentication API implemented with 24 integration tests |
| 2026-10-10 | Authentication screens built (sign in, sign up, forgot and reset password), verified end to end against a local database |
| 2026-10-10 | Wedding creation: `POST /api/wedding`, Create Wedding screen, sign out, and redirects for signed-in users on /login, /signup and /create-wedding |
| 2026-10-17 | Sign out in the dashboard header (shared `SignOutButton`, also used on Create Wedding) |
| 2026-10-17 | Dashboard: `GET /api/dashboard`, `GET /api/wedding`, the dashboard screen and the restyled app shell; dashboard reads implemented in the events, tasks, guests, expenses, vendors and members modules |
| 2026-10-29 | Security upgrade: Next.js 16.4.0 → 16.4.3 (critical advisories: RCE in `use cache` typed arrays and SVG image optimisation, Server Actions DoS), `eslint-config-next` to match, zod 4.6.5 → 4.6.7 and fast-uri via `npm audit fix`; `npm audit` clean |
| 2026-10-29 | Wedding members API: list members, invite by email, list and revoke invitations, public invite preview, accept (one transaction), change role and remove with the last-Admin rule; placeholder rate limits; 32 integration tests and race unit tests |
| 2026-10-29 | `/join/[token]`: invitation page with built-in sign-up and sign-in, one-click join for signed-in invitees, all error states, desktop + mobile; 15 component tests and a smoke test |
| 2026-10-29 | Settings → Wedding Members screen (invite dialog, roles, remove/leave, pending invitations, Manager read-only view) and Settings tabs; 14 component tests. Wedding members feature complete |
| 2026-10-29 | Wedding settings: `PATCH /api/wedding` (9 integration tests) and Settings → Wedding Details (8 component tests); time zone picker shared with Create Wedding. Phase 1 features complete |
| 2026-10-29 | Code-review fixes: invitation resend endpoint (old link survives a failed email), stored time zone always offered in the picker, rate limit on the `/join/[token]` page lookup, no 403 flash when leaving a wedding (and creating a wedding drops the old wedding's cached data), "already has a wedding" shown right after signing up on the join page, focus kept inside dialogs, one shared wedding-date rule |
| 2026-10-29 | Testing fixes: join page offers "Sign out and continue" before "already in a wedding"; Wedding Details save bar is compact, sticky only with unsaved changes and clear of the phone "+"; Revoke asks first and every member action replaces the last message; the invitation email says "as an Admin"; managers are told how to leave |
