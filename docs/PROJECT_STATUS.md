# Project Status — Make My Marriage

**Last updated:** 2026-10-17
**Current phase:** Phase 1 — Foundation (PRD §16)
**Next up:** Dashboard (`GET /api/dashboard`, summary cards, countdown) from the Stitch dashboard designs

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

### Phase 1 — Foundation 🚧

| Feature | Status | Notes |
| --- | --- | --- |
| Public home page | ✅ | See Completed |
| Authentication API (6 endpoints) | ✅ | Signup, login, logout, me, forgot and reset password; passwords ≥ 8 characters, reset links last 60 minutes and revoke all sessions |
| Authentication screens | ✅ | Sign in, sign up, forgot password ("Check your email"), reset password (expired / used / updated), desktop + mobile, from the Stitch auth designs |
| Wedding creation (create wedding + ADMIN membership) | ✅ | `POST /api/wedding` (one transaction, unique web address, gallery token, one wedding per user) and the Create Wedding screen with live preview, time zone, sign out and the "Invited by family?" note |
| Wedding members (invite, accept, roles) | ⏳ | |
| Dashboard shell | ⏳ | Guarded layout and header (couple, countdown, sign out) exist; content not built. Stitch dashboard design exists |

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
  members and the organiser gallery as `live`, but those features are not built yet. Flip each one to
  match reality before the site goes public.
- **Privacy wording.** Confirm the home page line "Your data stays yours: used only to run your
  wedding".
- **Endpoint table in `docs/CODEBASE_ARCHITECTURE.md` §14** still lists the six auth endpoints as
  "501 stub". That file is outside the editable set; `tests/architecture/api-inventory.ts` marks them
  `implemented: true`.
- **Per-email limit on forgot-password.** Only a per-IP limit exists today, so one IP can send up to
  5 reset emails per 15 minutes to the same address. Revisit if abuse appears.
- **`GET` / `PATCH /api/wedding`** are still stubs; they arrive with the dashboard and wedding settings.
- **Database name.** `.env.local` points at the Atlas cluster without a database name, so data lands in
  `test`. Add `/make-my-marriage-dev` before `?` in `MONGODB_URI` to give it its own database.
- **Deleting a wedding (when it is built).** The "already has a wedding" check in `createWedding` counts a
  membership even when its wedding is soft-deleted, but the dashboard guard treats that user as having no
  wedding and sends them to Create Wedding, so they would be stuck. Deleting a wedding must also remove
  (or release) its memberships. Found in the 2026-10-17 code review.
- **Three-way web-address race.** If three people create a wedding with the same names and date at the
  same instant, the third can get a 500 instead of the next free address (`createWedding` retries a
  taken address only twice). Very unlikely; harden if it ever shows up. Found in the 2026-10-17 code review.
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
