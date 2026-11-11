# Project Status — Make My Marriage

**Last updated:** 2026-11-04
**Current phase:** Phase 2 — Planning (PRD §16): complete and QA-verified (4 Nov, 256/257 checks; the one P3 fixed); Phase 1 complete and QA-verified (3 Nov)
**Next up:** Phase 3 — Guests (guests, invitations, RSVP, email jobs), starting with the R8/R9 clean-ups. Open decision: D7 (time zone change and event clock times)

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

### Phase 2 — Planning ✅

| Feature | Status | Notes |
| --- | --- | --- |
| Events | ✅ | API (2026-11-04): list (start-time order, archived hidden unless asked, `from`/`to` window), create, get, partial edit with version check, archive. Screens (dashboard style, desktop + mobile): `/app/events` with upcoming, past and archived-on-request lists, an add/edit dialog with occasion shortcuts and wall-clock times in the wedding's time zone (an end before the start is the next day); `/app/events/[id]` with when and where, Google Maps link, dress code, notes, edit (reload on conflict) and archive with confirmation. Dashboard and "+" links open the add form (`?new=1`). Cover images wait for Phase 5 uploads |
| Tasks | ✅ | API (2026-11-04): paged list (newest first) with status, priority, event, assignee, `none` and `mine` filters; create, get, partial edit with version check, hard delete; assignee and event checked against the wedding; server-owned `completedAt`. Screen (dashboard style, desktop + mobile): `/app/tasks` with All / My / Completed views, filters by status, event, assignee and priority (kept in the address), a tick to complete or reopen, overdue flags, "Former member" and archived-event labels, pages of 20, add/edit dialog (assignee, event, due day in the wedding's time zone, priority, status, notes) with reload on conflict and delete with confirmation. Event pages list their tasks with "Add task" linked to the event. Dashboard, checklist and "+" links open the add form |

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

- **Home page badges follow what is built.** Family members, events and tasks are `live`; flip each
  later feature in `feature-availability.ts` (and its test) when its phase ships.
- **Privacy wording.** Confirm the home page line "Your data stays yours: used only to run your
  wedding".
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** still lists the six auth endpoints as
  "501 stub". That file is outside the editable set; `tests/architecture/api-inventory.ts` marks them
  `implemented: true`.
- **Per-email limit on forgot-password.** Only a per-IP limit exists today, so one IP can send up to
  5 reset emails per 15 minutes to the same address. Revisit if abuse appears.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** also lists the eight member endpoints as
  "501 stub"; the inventory marks them implemented.
- **Member rate limits are placeholders.** Invites 30 per wedding per hour, the public invite preview
  60 per IP per minute, accepting 20 per user per 15 minutes. Tune with real traffic.
- **Local testing setup (QA 3 Nov).** `npm run db:dev`, then `next dev` with
  `MONGODB_URI=mongodb://127.0.0.1:27017/make-my-marriage-dev?replicaSet=rs0` and
  `EMAIL_PROVIDER=console` (or an empty `RESEND_API_KEY` and no Gmail settings): emails print to the
  console. `.env.local` now leaves `RESEND_API_KEY` blank (the old
  key is kept commented out): it only delivered to the Resend account owner. Use Resend again only with
  a verified domain and a matching `EMAIL_FROM`.
- **Sending real email without a domain (11 Nov).** `onboarding@resend.dev` only delivers to the Resend
  account's own address (Resend answers 403 for anyone else, so invites fail with "We couldn't send the
  email"). Until there is a verified domain, set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (a Google app
  password; 2-Step Verification on) to send from a personal Gmail, about 500 recipients a day.
  `EMAIL_PROVIDER=gmail|resend|console` picks the sender explicitly; unset, the first configured of
  Gmail, Resend, console is used. The server logs "Email transport selected" with the adapter on its
  first email. Not for production or guest invitations at scale (Phase 3): get a
  domain and verify it in Resend before launch.
- **Mongoose security advisories (11 Nov).** `npm audit` reports high-severity advisories for
  mongoose 9.0.0–9.11.3 (fix available via `npm audit fix`). Upgrade and rerun the full suite.
- **Restart `next dev` after this change.** The identity ports are registered once at startup, so a
  running dev server keeps showing the header without the wedding's place until it restarts.
- **Dashboard links lead to placeholders.** Every card, "+ Add" item and checklist step links to the
  page where that record is added (guests, expenses, …). Those pages are placeholders until their phase
  lands; events and tasks are real since 2026-11-04.
- **Archiving an event cannot be undone yet.** There is no unarchive endpoint in API_DESIGN; the
  confirmation says so. Add one if families ask for it.
- **RSVP reminder and WhatsApp buttons** from the dashboard design are left out until Phase 3 (guest
  invitations), so the RSVP overview shows counts and a link to RSVP status only.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** also still lists `GET /api/wedding` and
  `GET /api/dashboard` as "501 stub"; the inventory marks them implemented. The same is true of `PATCH /api/wedding`.
- **Atlas database renamed (3 Nov).** `.env.local` now writes to `make-my-marriage-dev`; older data
  stays in the `test` database.
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
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** also still lists the five event and five task
  endpoints as "501 stub"; the inventory marks them implemented.
- **Event cover images (Phase 5).** PRD §9.5 lists a cover image; `POST /api/events/:id/cover/upload-url`
  stays a stub until uploads land with the website and covers work.
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** does not list
  `POST /api/members/invitations/:id/resend` (added 2026-10-29; the inventory has it).
- **Rate-limit client IP.** Limits key on the first `X-Forwarded-For` address (`src/server/http/client-ip.ts`),
  which Vercel sets. If the app is ever self-hosted, read the IP only from the proxy's trusted header,
  or the limits can be bypassed.
- **Sign-in page flash (accepted).** Signed-in visitors of /login and /signup briefly see the form
  before the redirect (the check runs inside `<Suspense>`). Cosmetic; left as is.
- **Watch list (seen once, not reproduced):** `POST /api/auth/logout` answered 500 once on 17 Oct right
  after creating a wedding; the integration suite failed once on a cold first run. Capture the stack
  trace / check the in-memory MongoDB start-up timeout if either recurs. Close stray `localhost:3000`
  tabs when testing: one reloading /login twice a second flooded the dev log on 3 Nov.
- **Decision needed: changing the wedding's time zone (QA D7, 4 Nov).** Events and due dates keep their
  moment in time, so after switching from India to London a 6:00 PM IST Sangeet reads 12:30 PM. Right
  for a wedding that really moves; surprising when someone corrects a wrongly chosen time zone after
  adding events. Options: keep as is, warn on the Wedding Details save when events exist, or offer to
  keep clock times (shift every event and due date by the offset change).
- **`.env.local` points at Atlas `test` again (QA note, 4 Nov).** The QA plan's local setup uses
  `db:dev`; switch `MONGODB_URI` before the next QA round, and restart `next dev` (QA stopped it).
- **PATCH without `version` is last-write-wins for API clients (QA note).** The UI always sends it;
  making `version` required would match binding decision 8 more strictly. Revisit if other clients appear.
- **Production keys for later phases (11 Nov).** R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and `GOOGLE_PLACES_API_KEY` are no longer required for
  production to start; their services throw in production when the keys are missing (instead of
  silently using the fakes). Add them in Vercel before shipping vendor discovery (Phase 4), covers
  (Phase 5) and the gallery (Phase 6).
- **Email job schedule (11 Nov).** Vercel Hobby refused the deploy with the 5-minute cron (`*/5 * * * *`):
  Hobby allows daily cron jobs only. `vercel.json` now runs `/api/internal/jobs/email` daily at
  02:30 UTC (08:00 IST), which is fine while the worker has nothing to send. **Before Phase 3's bulk
  guest email**, choose how it runs more often: Vercel Pro (restore `*/5 * * * *`), an external
  scheduler (e.g. GitHub Actions or cron-job.org) calling `GET /api/internal/jobs/email` with
  `Authorization: Bearer <CRON_SECRET>`, or processing a batch right after jobs are queued (`after()`)
  with the daily cron as a safety net.
- **Phase 3 start: shared form pieces (code review R8).** `SaveProblem` (event and task forms), the
  list skeletons and the `secondaryButton` / `dangerButton` class strings are copied across the events
  and tasks screens. Move the buttons next to `primaryButton` in `dashboard-card.tsx` (or a shared
  button module), make one `SaveProblem` that takes its copy as props and one list skeleton, before
  guests copies them again.
- **Phase 3 start: shared UI in other features (code review R9).** Events and tasks import `Dialog` from
  `features/members` and `isOverdue`, `eventTimeRange`, `formatShortDate`, `taskDueDay` from
  `features/dashboard/format.ts`. Move `Dialog` (and its test) to `src/components/` and the formatters
  to `src/lib/`; no behaviour change.
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
| 2026-11-03 | A wedding date may be at most 5 years ahead (`WEDDING_DATE_MAX_YEARS_AHEAD`), in the wedding's time zone, on create and on a changed date; one rule (`weddingDateProblem`) serves the API, both forms and the preview |
| 2026-11-03 | Signing in returns to the page asked for: the proxy (no cookie) and the dashboard guard (expired session) add `?next=` for `/app` pages, and the login form follows it. Only same-origin `/app` paths are accepted (binding decision 12) |
| 2026-11-03 | Signing up or signing in from a browser that already has a session ends that old session once the new one exists; a failed attempt keeps it |
| 2026-11-03 | Confirmed after QA: Managers cannot leave by themselves; the web address keeps the creation date when the date changes; the dashboard greets the couple; the join page opens on "Create an account" (it never reveals whether an account exists) |
| 2026-11-03 | A resent invitation email starts with "Reminder:" and says its link replaces the earlier one |
| 2026-11-04 | Event edits: `version` (from the event DTO) is optional on `PATCH /api/events/:id`. When sent and stale, the edit is refused with `CONFLICT`; without it the service still checks the version atomically between its read and write (matching the task notes, API §37). A PATCH must change at least one field |
| 2026-11-04 | Archived events are read-only: editing one answers `CONFLICT` ("This event is archived…"). Archiving bumps the version and archiving again still succeeds. `GET /api/events/:id` returns archived events |
| 2026-11-04 | `GET /api/events?from&to` keeps events that start in [from, to) (ISO instants with an offset); `to` must be after `from` |
| 2026-11-04 | Event form: date plus wall-clock start and optional end time in the wedding's time zone; an end earlier than the start means the next day (a Sangeet from 8 PM to 1 AM). New events default to the wedding day (or today once it has passed) at 6 PM. Picking an occasion fills the name unless the person typed their own |
| 2026-11-04 | Removing a member keeps their tasks assigned to them (API_DESIGN §35 notes: removed-member references "remain visible and can be retained or cleared on edit"); the DTO carries `assignedMembershipId` with a null `assignee`, which the UI shows as "Former member". This replaces the earlier plan to unassign them |
| 2026-11-04 | Task references: a new assignee must be a current member and a new event an active event of the wedding (`VALIDATION_ERROR` with `assignedMembershipId` / `eventId` details, both reported together); a reference the task already has is kept even if that member left or the event was archived. Tasks follow the event rules for `version` (optional, stale → `CONFLICT`) and need at least one field per PATCH. `DELETE /api/tasks/:id` answers `{ success: true }` |
| 2026-11-04 | Tasks screen: "All tasks" is every task (any status), "My tasks" the caller's, "Completed" the completed ones; the other filters apply within a view and stay in the address (`?view=`, `?status=`, `?eventId=`, `?assignedMembershipId=`, `?priority=`). A due date is a day in the wedding's time zone, stored as midnight there. The tick toggles Completed ↔ To Do; In Progress is set in the form. An event page shows up to 50 of its tasks |
| 2026-11-04 | Event form: an optional **Ends on** date covers events longer than a day; it is filled from the stored end when the same-day / next-day rule doesn't give it, and moving the start date moves it too (code review R3) |
| 2026-11-04 | Event and task edit forms keep what was typed when a newer copy arrives in the background; saving then answers CONFLICT and **Reload** fetches the latest copy by id (code review R4). /app/tasks reads its view and filters from the address (`useSearchParams`), so links into it work while it stays mounted (code review R1) |
| 2026-11-11 | Production requires only what Phases 1–2 use: database, `SESSION_SECRET`, `CRON_SECRET`, `EMAIL_FROM` and the chosen email sender's settings. R2 and Google Places keys become necessary when their features ship; until then storage and vendor discovery refuse to run in production rather than fall back to the fakes. Found on the first Vercel deploy (every request answered 500 because those five keys were missing) |
| 2026-11-11 | Scrollbars stay themed app-wide, as the product owner asked ("in all the pages"): on macOS this trades overlay scrollbars for always-visible slim ones. The page reserves its scrollbar gutter (`scrollbar-gutter: stable`) so content doesn't shift between short and long pages (code review D8) |
| 2026-11-11 | Emails share one branded layout (`src/server/email/templates/layout.ts`) in the app's palette: wordmark header (text, no images: Gmail blocks SVG and a localhost logo can't load), gold-topped card, serif heading, details panel, burgundy table-cell button with the plain link underneath. Table layout and inline styles only, system serif instead of web fonts; every email keeps a plain-text version |
| 2026-11-11 | `EMAIL_PROVIDER` (gmail, resend or console) switches the email sender; the chosen sender's settings are checked at startup. Unset, Gmail is used when configured, then Resend, then the console. Production may send through Gmail instead of Resend (RESEND_API_KEY is then not required) but never through the console |
| 2026-11-11 | Email can go out through a personal Gmail (Google app password, nodemailer over Gmail SMTP) when there is no verified domain for Resend. Gmail wins over Resend while configured; the From line uses the Gmail address with EMAIL_FROM's display name. nodemailer 10.2.1 pinned (7.x and ≤10.1.3 have advisories); it is fenced like the Resend SDK (`src/server/email/adapters` only) |
| 2026-11-04 | Events list: upcoming (including events still running) in date order, past most recent first, archived only on request. Times show in the wedding's time zone, named on the page |

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
| 2026-11-03 | QA hand-off fixes: Atlas database name and blank Resend key in `.env.local`; honest home page badges; 5-year wedding-date limit; `?next=` after sign-in; replaced sessions end on sign-up and sign-in; preview never shows "Married" for a rejected date; "Get started" eyebrow; Wedding Details flags a bad date as soon as it changes; "Reminder:" on resent invitations; long invited emails wrap on the join page |
| 2026-11-04 | Events API (Phase 2, slice 1): list, create, get, update and archive (API §29–33) with optimistic concurrency, plus `assertActiveEventsInWedding` for tasks; 31 integration tests, schema unit tests and the first critical security test (cross-wedding event fetch → 404) |
| 2026-11-04 | Events screens (Phase 2, slice 2): `/app/events` list and add form, `/app/events/[id]` detail with edit and archive, shared event row on the dashboard, wall-clock time helpers in `@/lib/dates`; 31 new unit and component tests. Home page Events badge now live. Events feature complete |
| 2026-11-04 | Tasks API (Phase 2, slice 3): list, create, get, update and delete (API §34–38) with filters, pagination, server-owned `completedAt`, optimistic concurrency and same-wedding reference checks (`membersService.assertMembershipInWedding`); 29 integration tests, schema unit tests and the second critical security test (cross-wedding task edit → 404) |
| 2026-11-04 | Tasks screen (Phase 2, slice 4): `/app/tasks` views, filters, tick, add/edit/delete dialog; tasks on event pages; shared task details with the dashboard ("Former member", archived events); home page Tasks badge live; 18 new unit and component tests. Phase 2 features complete |
| 2026-11-04 | Phase 2 code-review fixes R1–R7: task links followed while the screen stays mounted; emptied last page moves back; multi-day events editable (Ends on); edit forms survive background refetches; event changes refresh task lists; task form explains failed member/event lists; events Upcoming/Past kept current. 13 new tests, each failing before its fix. R8/R9 clean-ups listed for the start of Phase 3 |
| 2026-11-04 | Phase 2 QA (handoffs/qa-report-phase-2.md): 256 of 257 checks pass, no P1/P2, no cross-wedding leaks. Fixed P3-1 (event rows now say "(next day)" or the end date, as the event page does) and the filter-label polish (labels linked by id); added the D8 test QA couldn't run (50-task cap and "All tasks for this event" link). Phase 2 QA-verified |
| 2026-11-11 | Gmail email sender (`GMAIL_USER` / `GMAIL_APP_PASSWORD`) for sending invitations without a domain; adapter selection logged; env validation for the pair; 10 new unit tests. Investigated missing invitation emails: `onboarding@resend.dev` only delivers to the Resend account owner |
| 2026-11-11 | `EMAIL_PROVIDER` switch between Gmail, Resend and the console, validated at startup; 6 new unit tests |
| 2026-11-11 | Branded email layout for every email (member invitation, password reset, guest invitation, RSVP reminder): ivory background, gold-topped white card, Make My Marriage wordmark, serif heading, details panel, burgundy pill button with a plain-link fallback. Table layout and inline styles for Gmail/Outlook; no images, style blocks or web fonts. 7 new unit tests |
| 2026-11-11 | Vercel cron for the email worker changed from every 5 minutes to daily (02:30 UTC): the Hobby plan rejects more frequent crons and failed the deploy. Phase 3 needs a more frequent option (open item) |
| 2026-11-11 | First Vercel deploy fixes: R2 and Google Places keys no longer required at startup (services fail loudly in production without them); 3 new unit tests |
| 2026-11-11 | Scrollbars styled in the brand palette everywhere (`src/app/globals.css`): slim rounded burgundy thumb (always, a little stronger on hover), no track or arrow buttons; standard `scrollbar-color` for Firefox only, so Chromium keeps the rounded thumb |
