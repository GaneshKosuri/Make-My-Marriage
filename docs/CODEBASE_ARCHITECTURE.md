# Make My Marriage
## Application / Codebase Architecture

**Version:** V1 scaffold
**Status:** Baseline for implementation (requested by API_DESIGN §112)
**Applies to:** everything under `src/`, `tests/` and the project configuration

---

# 1. Purpose

PRD → SYSTEM_DESIGN → DATABASE_DESIGN → API_DESIGN define *what* to build. This
document defines *where code lives and how it is wired*, so each product phase
(PRD §16) can be implemented without inventing architecture.

It covers the folder structure, module anatomy, dependency rules, the request
pipeline (`route()`), tenant isolation, token rules, the binding decisions taken
during scaffolding, the full route inventory, a recipe for adding an endpoint,
and the decisions that are still open.

**Doc precedence when sources disagree:** dated implementation notes
(2026-09-16, 2026-09-18) → API_DESIGN → DATABASE_DESIGN → SYSTEM_DESIGN for
technical detail; the PRD wins on product scope; the binding decisions in §11
of this document override all of them. Dated notes describe an earlier
implementation that is *not* in this repository — treat them as requirements.

---

# 2. Stack and framework conventions

| Concern | Choice |
|---|---|
| Runtime | Node 22 LTS (`.nvmrc`), npm |
| Framework | Next.js 16.4 App Router, React 19.3, TypeScript 5.9 strict (+ `noUncheckedIndexedAccess`, `noImplicitOverride`) |
| Rendering | **Cache Components** (`cacheComponents: true`, `partialPrefetching: true` — the Next 16.4 default) |
| API | REST via Route Handlers, every handler built with `route()` |
| Data | MongoDB Atlas + Mongoose 9 |
| Validation | Zod 4 at every external boundary; all request schemas `.strict()` |
| Auth | Custom email/password, argon2id (`@node-rs/argon2`), server-side sessions, `mmm_session` cookie |
| Files | Cloudflare R2 via `@aws-sdk/client-s3` + presigner, behind `StorageService` |
| Email | Resend behind `EmailService` |
| Vendor discovery | Google Places behind `VendorDiscoveryService` |
| Jobs | `email_jobs` collection + Vercel Cron |
| UI | Tailwind CSS 4 (Turbopack loader), shadcn/ui primitives, TanStack Query, React Hook Form |
| Tests | Vitest 5 (unit + integration projects), Testing Library, `mongodb-memory-server` replica set, Playwright |

Next.js 16 specifics that shape the code (read `node_modules/next/dist/docs/` before changing them):

- `params` / `searchParams` / `cookies()` are **async**.
- `src/proxy.ts` replaces `middleware.ts` and always runs on Node.js.
- `next lint` is gone; `npm run lint` runs ESLint 9 directly with a flat config.
- With Cache Components, request-time reads (cookies, the session, `new Date()`)
  must sit inside `<Suspense>`. The static shell is prerendered, and the
  request-dependent part streams in.
- `next dev` writes to `.next/dev`, `next build` to `.next`. Only one `next dev`
  may run per directory.

---

# 3. Folder structure

```text
.
├── docs/                     source of truth (read-only) + this document
├── brand/                    logos (source); copies in public/brand/
├── prompts/                  design prompts (read-only)
├── src/
│   ├── app/                  ROUTING ONLY — pages, layouts, route handlers compose modules
│   │   ├── layout.tsx  globals.css  not-found.tsx  providers.tsx
│   │   ├── (marketing)/page.tsx                    /
│   │   ├── (auth)/login | signup | forgot-password | reset-password/[token]
│   │   ├── (onboarding)/create-wedding | join/[token]
│   │   ├── (dashboard)/app/…                       /app/* — Wedding Members only
│   │   ├── (public)/w/[slug]/                      public wedding website
│   │   ├── (guest)/invite/[token] | gallery/[token]  token pages, mobile-first, noindex
│   │   └── api/                                    mirrors API_DESIGN §105 (+ health, photo download)
│   ├── modules/              DOMAIN — one folder per bounded context
│   │   └── auth weddings members events tasks guests expenses vendors photos dashboard email-jobs
│   ├── server/               INFRASTRUCTURE — cross-cutting, server-only, domain-agnostic
│   │   └── config db http auth security errors email storage places logging
│   ├── features/             CLIENT UI per domain (components, TanStack Query hooks, forms)
│   ├── themes/               wedding-website renderers: classic/ minimal/ modern/ + registry
│   ├── components/ui         shadcn primitives
│   ├── components/layout     AppShell, Sidebar, MobileNav, WeddingHeader, GuestShell, PagePlaceholder
│   ├── lib/                  isomorphic utils: api-client, money, dates, whatsapp, cn, pagination, object-id
│   ├── composition-root.ts   wires infrastructure ports to module implementations
│   ├── instrumentation.ts    calls the composition root once per server instance
│   └── proxy.ts              cookie-presence redirect for /app/*
└── tests/
    ├── setup/                MongoMemoryReplSet global setup, env, factories
    ├── architecture/         API inventory + structural convention tests (unit project)
    ├── integration/          API + DB
    ├── security/             SYSTEM_DESIGN §91 cases
    └── e2e/                  Playwright
```

---

# 4. Module anatomy

Every module in `src/modules/<name>/` follows the same shape (entity prefix varies):

| File | Contents | Runs |
|---|---|---|
| `x.constants.ts` | enums (`as const` arrays + types), labels, limits — the single source for Mongoose **and** Zod | isomorphic |
| `x.schemas.ts` | Zod request schemas, always `.strict()`; path-param schemas exist already | isomorphic |
| `x.types.ts` | DTOs and service inputs | isomorphic |
| `x.model.ts` | Mongoose schema, indexes, tenant guard, `defineModel()` | server-only |
| `x.repository.ts` | data access; **`weddingId` is always the first argument** | server-only |
| `x.service.ts` | business rules, cross-entity checks, workflows; `ctx` first | server-only |
| `x.mapper.ts` | document → DTO; strips secrets | server-only |
| `x.service.test.ts` | co-located tests (currently the phase's test plan as `it.todo`) | test |
| `index.ts` | the module's public server API | server-only |

`dashboard` has no model or repository (aggregation only). `weddings` also owns
`website.service`, `livestream.service`, `gallery-settings.service` and
`wedding.slug`. `email-jobs` has `email-job.worker`. `auth` has
`identity.adapter` (see §5.2).

Scaffold state: constants, models, indexes, param schemas and the identity read
path are real. Every other service and repository function has its final
signature and throws `NOT_IMPLEMENTED` with a doc reference.

---

# 5. Dependency rules

## 5.1 The rules

| # | Rule | Enforced by |
|---|---|---|
| 1 | `app/api/**/route.ts` imports only `@/server/http`, a module's `index.ts` and `*.schemas.ts`. Never a model or repository. | ESLint `no-restricted-imports`; `tests/architecture` |
| 2 | A module calls its own repository and **other modules' services via their `index.ts`** (e.g. `eventsService.assertActiveEventsInWedding(weddingId, ids)`). Other modules' `*.constants/schemas/types` are fine. | ESLint |
| 3 | `modules/*` may import `server/*`; **`server/*` never imports `modules/*`** (or UI). | ESLint |
| 4 | Client code (`features/`, `components/`, `themes/`, `lib/`, any `"use client"`) imports only `*.constants`, `*.schemas`, `*.types` from modules; never `@/server` or server packages. | ESLint + `server-only` |
| 5 | Server Components may call module services directly for **reads**. **All mutations go through REST route handlers** — no Server Actions for mutations. | review |
| 6 | Every server-only file starts with `import "server-only";`. | `tests/architecture/conventions.test.ts` |

Also enforced: no `Math.random` in `src/server` and `src/modules` (use
`node:crypto`), and no provider SDK imports (`resend`, `@aws-sdk/*`) outside
`src/server`.

## 5.2 Ports and the composition root

Request authentication is infrastructure (`server/auth`, `server/http`), but the
data it needs (sessions, users, memberships, weddings) belongs to domain
modules. Rule 3 forbids `server` → `modules`, so:

1. `src/server/auth/identity.ts` declares **ports**: `SessionStore` and `IdentityDirectory`.
2. `src/modules/auth/identity.adapter.ts` **implements** them, using the members
   and weddings public APIs.
3. `src/composition-root.ts` registers the implementation (`configureIdentity`).
   It is the only file that imports both sides.
4. `src/instrumentation.ts` calls the composition root once per server instance,
   before any request. The Vitest setup files do the same.

The registry lives on `globalThis`, so every server bundle shares it. If you add
another port, add it to the composition root. In `next dev`, restart the server
after editing an adapter, because instrumentation does not hot-reload it.

---

# 6. The request pipeline: `route()`

```ts
// src/app/api/tasks/[taskId]/route.ts
import { ok, route } from "@/server/http";
import { tasksService } from "@/modules/tasks";
import { taskIdParams, updateTaskSchema } from "@/modules/tasks/task.schemas";

export const PATCH = route({
  auth: "member",
  params: taskIdParams,
  body: updateTaskSchema,           // optional; `query` too
  // rateLimit: policies.example,   // optional
  handler: async ({ ctx, params, body }) =>
    ok(await tasksService.update(ctx, params.taskId, body)),
});
```

Pipeline, in order (`src/server/http/route.ts`):

1. Assign a request id (`x-request-id`).
2. Mutations (POST/PUT/PATCH/DELETE) on every non-`internal` route: `Origin`
   must equal `NEXT_PUBLIC_APP_URL`, otherwise 403. The Host header is never trusted.
3. Resolve the auth level into `ctx`.
4. Read the JSON body (only when `body` is configured), capped at **8 KiB**.
5. Validate params, query and body with Zod. On failure, return
   `VALIDATION_ERROR` with per-field `details`. Body fields are unprefixed;
   query and path params use `query.x` / `params.x`. Path params can map to
   `NOT_FOUND` (public token/slug routes) or `INVALID_TOKEN` (member-invite accept).
6. Rate limits (policies from `@/server/http` → `policies`).
7. Run the handler; it returns a response helper.

An `AppError` becomes `{ error: { code, message, details? } }` with its status.
Anything else becomes a generic `INTERNAL_ERROR` 500, logged with the request id
and never leaked. Every API response is `Cache-Control: no-store`. Each request
is logged as JSON with `requestId, method, route, status, userId, weddingId,
durationMs, errorCode`, with token path segments replaced.

| Auth level | Meaning | `ctx` |
|---|---|---|
| `public` | no session | `{ requestId }` |
| `user` | valid session, membership optional (`/api/auth/me`, logout, `POST /api/wedding`, accept invite) | `{ requestId, userId, sessionId }` |
| `member` | session + membership in a non-deleted wedding; otherwise 403 | `{ requestId, userId, membershipId, weddingId, role }` |
| `admin` | member with role ADMIN (`/api/members/invitations*`, `PATCH/DELETE /api/members/:id`) | same as member |
| `internal` | `Authorization: Bearer <CRON_SECRET>`, constant-time compare, fails closed | `{ requestId }` |

Response helpers: `ok`, `created`, `paginated`, `cursorPaginated`, `success`,
`noContent`, `notImplemented(phase)`. Pagination (binding decision 6): page lists
default `limit` 20, max 100, `page` ≤ 100000; photo cursors default 24, max 48,
opaque base64url over `createdAt` + `_id` (+ filter scope).

Error codes and statuses live in `src/lib/error-codes.ts` (shared with the browser):

| Code | Status | Code | Status |
|---|---:|---|---:|
| VALIDATION_ERROR | 400 | EMAIL_ALREADY_EXISTS | 409 |
| UNAUTHENTICATED | 401 | ALREADY_HAS_WEDDING | 409 |
| FORBIDDEN | 403 | LAST_ADMIN | 409 |
| NOT_FOUND | 404 | GUEST_LIMIT_EXCEEDED | 400* |
| CONFLICT | 409 | INVITATION_ALREADY_ACCEPTED | 409 |
| INVALID_TOKEN | 400* | INVITATION_EMAIL_MISMATCH | 403* |
| TOKEN_EXPIRED | 410* | PARTY_SIZE_CHANGED | 400* |
| RATE_LIMITED | 429 | NOT_IMPLEMENTED (scaffold) | 501 |
| UPLOAD_ERROR | 400* | EXTERNAL_SERVICE_ERROR | 503* |
| INTERNAL_ERROR | 500 | | |

\* not specified by the docs; the reasoning is in the source comments.

---

# 7. Tenant isolation

The wedding is the tenant (SYSTEM_DESIGN §16, DATABASE_DESIGN §81).

1. **Context comes only from the session.** `route({ auth: "member" })` resolves
   session → user → membership → `ctx.weddingId`. Strict Zod schemas reject a
   client-supplied `weddingId` as an unknown field.
2. **Repositories take `weddingId` first**, and every filter includes it:
   `TaskModel.findOne({ _id, weddingId })`, never `findById`.
3. **Cross-entity references are validated through the owning module**, e.g.
   `eventsService.assertActiveEventsInWedding` and
   `membersService.assertMembershipInWedding`.
4. **Cross-tenant access returns 404, never 403** (API_DESIGN §96).
5. **Defence in depth:** `tenantGuardPlugin` (`src/server/db/plugins/tenant-guard.ts`)
   is installed on every wedding-owned model. Any find, count, update, delete or
   distinct without `weddingId` in the filter throws `TenantScopeError`, and
   aggregations must begin with `{ $match: { weddingId } }`. The opt-out
   `.setOptions({ tenantScoped: false })` is permitted only for token/slug
   resolution, identity resolution (session → membership) and the email worker.
   `bulkWrite`/`insertMany` are not covered; inserts rely on `weddingId: required`.

---

# 8. Tokens and secrets

| Secret | Generated | Stored | Notes |
|---|---|---|---|
| Session | `generateToken()` (32 random bytes, base64url, 43 chars) | `HMAC("session")` only | cookie `mmm_session`: HttpOnly, Secure in prod, SameSite=Lax, Path=/; fixed lifetime `SESSION_TTL_DAYS`; TTL index |
| Password reset | same | `HMAC("password-reset")` only | single use, expires, TTL index |
| Member invitation | same | `HMAC("member-invite")` only | link `/join/[token]` |
| Guest invitation | same | **raw**, `invitationToken`, unique, `select: false` | stable share link `/invite/[token]` (decision 1) |
| Gallery | same | **raw**, `gallery.token`, unique, `select: false` | stable URL / printed QR `/gallery/[token]` (decision 2) |
| Rate-limit keys | — | `HMAC("rate-limit", policy‖window‖subject)` | raw tokens and IPs are never stored |
| Passwords | — | argon2id (m=19 MiB, t=2, p=1) | `verifyPasswordOrBurn` equalises timing for unknown emails |

All HMACs use per-purpose keys derived from `SESSION_SECRET`, so a hash made for
one purpose is useless for any other. The logger redacts secret-looking keys
(including any key ending in `url`) and presigned URLs, and strips token path
segments. Token pages send `X-Robots-Tag: noindex` and `Referrer-Policy:
no-referrer` (`next.config.ts`).

---

# 9. Data layer

- 13 collections from DATABASE_DESIGN §112, plus `rate_limits` (decision 4).
  Every model has an explicit collection name, `timestamps: true` and
  `strict: "throw"`, and is created with `defineModel()` (no recompilation on hot reload).
- All indexes from DATABASE_DESIGN §91 plus the photo-lifecycle listing indexes
  and the partial uniques (one pending member invite per wedding+email; one
  Google place per wedding). `tests/integration/indexes.test.ts` asserts them.
- **Money** is integer paise everywhere (`amountPaise`, `totalAgreedCostPaise`).
  `src/lib/money.ts` formats it with Indian grouping (`₹12,45,000`).
- **Dates:** `weddingDate` is a `YYYY-MM-DD` string with an IANA `timeZone`;
  event and task instants are UTC and rendered in the wedding's zone
  (`src/lib/dates.ts`).
- **Enums** are readable strings defined once in `*.constants.ts`.
- **Optimistic concurrency:** events, tasks and guests have `optimisticConcurrency`;
  repository updates are conditional on `__v`, and a mismatch is `CONFLICT` (decision 8).
- **Deletion** (DATABASE_DESIGN §92): wedding soft-delete (`deletedAt`), event and
  vendor archive (`archivedAt`), photo R2-delete then `DELETED` tombstone,
  member invitation keeps status, everything else hard-deleted.
- **Transactions** only for create wedding + ADMIN membership, and accept member
  invitation (`withTransaction`). Local development therefore needs a replica set.

---

# 10. Integrations

| Service | Interface | Adapters | Selection (`server/<x>/index.ts`) |
|---|---|---|---|
| Email | `EmailService.send({ to, template, props, idempotencyKey? })` | Resend, console (dev; refuses production), fake (tests) | test → fake; `RESEND_API_KEY` → Resend; else console |
| Storage | `StorageService`: `presignPut` (signs Content-Type + Content-Length), `presignGet` (attachment name), `head`, `readRange` (16 bytes, ETag-pinned), `copy` (ETag-conditional), `delete` | R2 (S3 API), fake | all `R2_*` set → R2; else fake |
| Vendor discovery | `VendorDiscoveryService.search / getPlaceDetails` | Google Places (signatures until Phase 4), fake | test → fake; key → Google; else fake |

Templates (`password-reset`, `member-invitation`, `guest-invitation`,
`rsvp-reminder`) take plain props and escape every value. Provider failures
become `EXTERNAL_SERVICE_ERROR`, with provider detail kept in the logs only.
Object keys follow DATABASE_DESIGN §102 (`weddings/{id}/gallery|covers|events/…`,
plus `staging/…`) and are never built from user filenames.

---

# 11. Binding decisions (from the scaffold brief) and where they live

1. Guest invitation token is stored raw: `guest.model.ts` (`invitationToken`, unique, `select: false`).
2. Gallery token is stored raw: `wedding.model.ts` (`gallery.token`, unique, `select: false`).
3. Session, reset and member-invite tokens are stored as HMAC-SHA-256 with purpose labels: `server/security/tokens.ts`.
4. 13 collections + `rate_limits`: `server/security/rate-limit.model.ts`.
5. Photo lifecycle (`uploadKey`, `status`, `expiresAt`, indexes) and `GET /api/photos/:id/download`.
6. Pagination limits: `src/lib/pagination.ts`, `server/http/pagination.ts`.
7. Expense categories use `OTHER`: `expense.constants.ts`.
8. Optimistic concurrency on events, tasks and guests.
9. `/api/internal/jobs/email` exports GET and POST, both requiring `CRON_SECRET`.
10. Error codes: `src/lib/error-codes.ts`, including `NOT_IMPLEMENTED` (501).
11. All request schemas are `.strict()`, so a client `weddingId` is rejected.
12. `/join/[token]` and `/reset-password/[token]` page URLs.

---

# 12. Pages and rendering

- `(dashboard)/app/layout.tsx` wraps a guard component in `<Suspense>`.
  `getCurrentContext()` (which awaits `connection()`, then reads the cookie and
  session) redirects to `/login` without a session and to `/create-wedding`
  without a membership; otherwise it renders `AppShell`. Pages render *inside*
  the guard. `src/proxy.ts` adds a cheap cookie-presence redirect.
- Navigation follows PRD §10 (`components/layout/nav-items.ts`). ADMIN-only items
  are filtered out on the server, so Managers never receive them.
- `/w/[slug]` renders through `themes/index.tsx` (`CLASSIC | MINIMAL | MODERN`);
  every theme receives the same `PublicWeddingDto`.
- Token pages (`(guest)`, `/join`, `/reset-password`) are noindex and no-referrer,
  in both metadata and headers.
- Client data fetching: TanStack Query hooks in `features/<domain>` call
  `@/lib/api-client`, keyed by `features/<domain>/query-keys.ts`. Forms use
  React Hook Form with `zodResolver(moduleSchema)`.

---

# 13. Testing

| Command | What |
|---|---|
| `npm test` | Vitest **unit** project: co-located `src/**/*.test.ts[x]` (jsdom via `// @vitest-environment jsdom`) and `tests/architecture` |
| `npm run test:integration` | Vitest **integration** project: `tests/integration` + `tests/security` against an in-memory MongoDB replica set (one database per file) |
| `npm run test:e2e` | Playwright smoke tests (desktop + mobile Chromium) |

`tests/architecture/api-inventory.ts` is the single source of truth for the
route table below. `api-routes.test.ts` fails if a route is missing, extra, or
exports the wrong methods or auth level.

---

# 14. Route inventory

78 endpoints in 53 route files: API_DESIGN §106, the §83 cover uploads (route
tree §105), `GET /api/photos/:photoId/download` (2026-09-18) and
`GET /api/health` (scaffold). Static segments (`rsvp-summary`, `actions/*`,
`summary`, `from-place`, `upload-url`, `invitations`) take precedence over their
dynamic siblings. This was verified against the running server.

| # | Method | Path | Auth | Phase | Spec | Status |
|---:|---|---|---|---|---|---|
| 1 | GET | `/api/health` | public | Scaffold | scaffold | **working** |
| 2 | POST | `/api/auth/signup` | public | Phase 1: Foundation | API §11 | 501 stub |
| 3 | POST | `/api/auth/login` | public | Phase 1: Foundation | API §12 | 501 stub |
| 4 | POST | `/api/auth/logout` | user | Phase 1: Foundation | API §13 | 501 stub |
| 5 | GET | `/api/auth/me` | user | Phase 1: Foundation | API §14 | 501 stub |
| 6 | POST | `/api/auth/forgot-password` | public | Phase 1: Foundation | API §15 | 501 stub |
| 7 | POST | `/api/auth/reset-password` | public | Phase 1: Foundation | API §16 | 501 stub |
| 8 | POST | `/api/wedding` | user | Phase 1: Foundation | API §17 | 501 stub |
| 9 | GET | `/api/wedding` | member | Phase 1: Foundation | API §18 | 501 stub |
| 10 | PATCH | `/api/wedding` | member | Phase 1: Foundation | API §19 | 501 stub |
| 11 | GET | `/api/dashboard` | member | Phase 1: Foundation | API §20 | 501 stub |
| 12 | GET | `/api/members` | member | Phase 1: Foundation | API §21 | 501 stub |
| 13 | PATCH | `/api/members/[membershipId]` | admin | Phase 1: Foundation | API §27 | 501 stub |
| 14 | DELETE | `/api/members/[membershipId]` | admin | Phase 1: Foundation | API §28 | 501 stub |
| 15 | POST | `/api/members/invitations` | admin | Phase 1: Foundation | API §22 | 501 stub |
| 16 | GET | `/api/members/invitations` | admin | Phase 1: Foundation | API §23 | 501 stub |
| 17 | DELETE | `/api/members/invitations/[invitationId]` | admin | Phase 1: Foundation | API §24 | 501 stub |
| 18 | GET | `/api/public/member-invitations/[token]` | public | Phase 1: Foundation | API §25 | 501 stub |
| 19 | POST | `/api/member-invitations/[token]/accept` | user | Phase 1: Foundation | API §26 | 501 stub |
| 20 | GET | `/api/events` | member | Phase 2: Planning | API §29 | 501 stub |
| 21 | POST | `/api/events` | member | Phase 2: Planning | API §30 | 501 stub |
| 22 | GET | `/api/events/[eventId]` | member | Phase 2: Planning | API §31 | 501 stub |
| 23 | PATCH | `/api/events/[eventId]` | member | Phase 2: Planning | API §32 | 501 stub |
| 24 | DELETE | `/api/events/[eventId]` | member | Phase 2: Planning | API §33 | 501 stub |
| 25 | GET | `/api/tasks` | member | Phase 2: Planning | API §34 | 501 stub |
| 26 | POST | `/api/tasks` | member | Phase 2: Planning | API §35 | 501 stub |
| 27 | GET | `/api/tasks/[taskId]` | member | Phase 2: Planning | API §36 | 501 stub |
| 28 | PATCH | `/api/tasks/[taskId]` | member | Phase 2: Planning | API §37 | 501 stub |
| 29 | DELETE | `/api/tasks/[taskId]` | member | Phase 2: Planning | API §38 | 501 stub |
| 30 | GET | `/api/guests` | member | Phase 3: Guests | API §39 | 501 stub |
| 31 | POST | `/api/guests` | member | Phase 3: Guests | API §40 | 501 stub |
| 32 | GET | `/api/guests/rsvp-summary` | member | Phase 3: Guests | API §52 | 501 stub |
| 33 | POST | `/api/guests/actions/send-invitations` | member | Phase 3: Guests | API §47 | 501 stub |
| 34 | POST | `/api/guests/actions/send-reminders` | member | Phase 3: Guests | API §49 | 501 stub |
| 35 | GET | `/api/guests/[guestId]` | member | Phase 3: Guests | API §41 | 501 stub |
| 36 | PATCH | `/api/guests/[guestId]` | member | Phase 3: Guests | API §42 | 501 stub |
| 37 | DELETE | `/api/guests/[guestId]` | member | Phase 3: Guests | API §43 | 501 stub |
| 38 | GET | `/api/guests/[guestId]/invitation-link` | member | Phase 3: Guests | API §45 | 501 stub |
| 39 | POST | `/api/guests/[guestId]/send-invitation` | member | Phase 3: Guests | API §46 | 501 stub |
| 40 | POST | `/api/guests/[guestId]/send-reminder` | member | Phase 3: Guests | API §48 | 501 stub |
| 41 | GET | `/api/public/invitations/[token]` | public | Phase 3: Guests | API §50 | 501 stub |
| 42 | POST | `/api/public/invitations/[token]/rsvp` | public | Phase 3: Guests | API §51 | 501 stub |
| 43 | GET | `/api/email-batches/[batchId]` | member | Phase 3: Guests | API §85 | 501 stub |
| 44 | POST | `/api/email-batches/[batchId]/retry-failed` | member | Phase 3: Guests | API §86 | 501 stub |
| 45 | GET | `/api/internal/jobs/email` | internal | Phase 3: Guests | API §87 (Vercel Cron uses GET) | **working** |
| 46 | POST | `/api/internal/jobs/email` | internal | Phase 3: Guests | API §87 | **working** |
| 47 | GET | `/api/expenses` | member | Phase 4: Financial & Vendors | API §53 | 501 stub |
| 48 | POST | `/api/expenses` | member | Phase 4: Financial & Vendors | API §54 | 501 stub |
| 49 | GET | `/api/expenses/summary` | member | Phase 4: Financial & Vendors | API §55 | 501 stub |
| 50 | GET | `/api/expenses/[expenseId]` | member | Phase 4: Financial & Vendors | API §56 | 501 stub |
| 51 | PATCH | `/api/expenses/[expenseId]` | member | Phase 4: Financial & Vendors | API §57 | 501 stub |
| 52 | DELETE | `/api/expenses/[expenseId]` | member | Phase 4: Financial & Vendors | API §58 | 501 stub |
| 53 | GET | `/api/vendors` | member | Phase 4: Financial & Vendors | API §59 | 501 stub |
| 54 | POST | `/api/vendors` | member | Phase 4: Financial & Vendors | API §60 | 501 stub |
| 55 | POST | `/api/vendors/from-place` | member | Phase 4: Financial & Vendors | API §61 | 501 stub |
| 56 | GET | `/api/vendors/[vendorId]` | member | Phase 4: Financial & Vendors | API §62 | 501 stub |
| 57 | PATCH | `/api/vendors/[vendorId]` | member | Phase 4: Financial & Vendors | API §63 | 501 stub |
| 58 | DELETE | `/api/vendors/[vendorId]` | member | Phase 4: Financial & Vendors | API §64 | 501 stub |
| 59 | GET | `/api/vendor-discovery/search` | member | Phase 4: Financial & Vendors | API §65–66 | 501 stub |
| 60 | GET | `/api/wedding/website` | member | Phase 5: Wedding Experience | API §67 | 501 stub |
| 61 | PATCH | `/api/wedding/website` | member | Phase 5: Wedding Experience | API §68 | 501 stub |
| 62 | GET | `/api/public/weddings/[slug]` | public | Phase 5: Wedding Experience | API §69 | 501 stub |
| 63 | GET | `/api/wedding/livestream` | member | Phase 5: Wedding Experience | API §70 | 501 stub |
| 64 | PATCH | `/api/wedding/livestream` | member | Phase 5: Wedding Experience | API §71–72 | 501 stub |
| 65 | POST | `/api/wedding/cover/upload-url` | member | Phase 5: Wedding Experience | API §83 | 501 stub |
| 66 | POST | `/api/events/[eventId]/cover/upload-url` | member | Phase 5: Wedding Experience | API §83 | 501 stub |
| 67 | GET | `/api/gallery/settings` | member | Phase 6: Memories | API §73 | 501 stub |
| 68 | PATCH | `/api/gallery/settings` | member | Phase 6: Memories | API §74 | 501 stub |
| 69 | GET | `/api/gallery/qr` | member | Phase 6: Memories | API §84 | 501 stub |
| 70 | GET | `/api/photos` | member | Phase 6: Memories | API §75 | 501 stub |
| 71 | POST | `/api/photos` | member | Phase 6: Memories | API §77 | 501 stub |
| 72 | POST | `/api/photos/upload-url` | member | Phase 6: Memories | API §76 | 501 stub |
| 73 | DELETE | `/api/photos/[photoId]` | member | Phase 6: Memories | API §78 | 501 stub |
| 74 | GET | `/api/photos/[photoId]/download` | member | Phase 6: Memories | API 2026-09-18 notes | 501 stub |
| 75 | GET | `/api/public/galleries/[token]` | public | Phase 6: Memories | API §80 | 501 stub |
| 76 | GET | `/api/public/galleries/[token]/photos` | public | Phase 6: Memories | API §79 | 501 stub |
| 77 | POST | `/api/public/galleries/[token]/photos` | public | Phase 6: Memories | API §82 | 501 stub |
| 78 | POST | `/api/public/galleries/[token]/upload-url` | public | Phase 6: Memories | API §81 | 501 stub |

Rate limits (API §99): `login`, `signup`, `forgotPassword`, `resetPassword`,
`publicInvitationView`, `galleryUploadUrl` and `galleryPhotoConfirm` attach via
`route({ rateLimit })`. RSVP (`rsvpPerInvitation` → `rsvpGlobal`) and member
photo issuance (`photoUploadPerMember` → `photoUploadPerWedding`) are consumed
inside the service, after validation, as API §51 and the 2026-09-18 notes require.

---

# 15. How to add an endpoint

1. **Inventory:** add the row to `tests/architecture/api-inventory.ts` (method,
   path, auth, phase, doc). The architecture test now fails until step 4 is done.
2. **Schemas:** in `src/modules/<m>/<m>.schemas.ts`, add `.strict()` Zod schemas
   for params, query and body. Reuse `objectId`, `pageQuerySchema` and
   `cursorQuerySchema`, and constants for enums and limits. Export
   `type XInput = z.infer<typeof xSchema>`.
3. **Service:** in `<m>.service.ts`, add `async op(ctx, …)` holding the
   business rules. Use the repository for data, with `weddingId` first. Use other
   modules only through `@/modules/<other>`, and integrations only through
   `@/server/{email,storage,places}`. Throw `AppError` codes. Map output through
   `<m>.mapper.ts` (strip secrets). Export it from `index.ts` if it is new.
4. **Route:** in `src/app/api/<path>/route.ts`, add
   `export const METHOD = route({ auth, params, query, body, rateLimit?, handler })`.
   The handler only calls the service and wraps the result.
5. **Tests:** unit-test the service rules (co-located). Add integration tests for
   DB behaviour and an isolation test (another wedding's id → 404). Replace the
   relevant `it.todo`s.
6. **Client:** add a hook in `src/features/<domain>/` using `apiFetch*` and the
   domain's query keys, and invalidate `xKeys.all` after mutations.
7. Run `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build`.

---

# 16. Open decisions

Decisions taken to unblock the scaffold where the docs were silent or
ambiguous. Each was resolved toward the safer option and can be revisited.

**Architecture and framework**
1. *Ports + composition root* reconcile rule 3 with session/membership
   resolution (§5.2). Instrumentation registers the ports; in `next dev`, edits
   to an identity adapter need a server restart.
2. *Cache Components* is adopted because it is the Next 16.4 default and becomes
   mandatory next major. Consequence: inside the dashboard guard, `redirect()` and
   `notFound()` are streamed after the shell, so the HTTP status is 200 and the
   browser follows the redirect or shows the not-found UI. The proxy still issues
   a real 307 when there is no cookie.
3. *TypeScript 5.9 / ESLint 9*: the generator pins `typescript@^5`, and
   `eslint-config-next@16` requires ESLint 9 (TypeScript 7 and ESLint 10 exist
   but are not supported by the Next tooling yet).

**HTTP and security**
4. The *Origin check* applies to every non-`internal` mutation, including public
   ones (login, signup, RSVP, guest uploads), and a missing Origin is rejected.
   This is stricter than "cookie-authenticated routes" (API_DESIGN §100).
5. An over-limit body returns `VALIDATION_ERROR` (400), not 413, because no
   documented code exists.
6. Signed in but without a membership, member routes return `FORBIDDEN` (403).
7. Unspecified statuses are chosen in `src/lib/error-codes.ts` (see §6).
8. All API responses are `no-store`, including the public website API. Revisit
   caching for `/api/public/weddings/:slug` with Cache Components.
9. A full script/style CSP needs per-request nonces plus YouTube and R2 sources.
   Only safe directives ship today (`frame-ancestors`, `base-uri`, `form-action`, `object-src`).
10. Rate-limit values not specified by the docs are placeholders. The client IP
    comes from `x-forwarded-for`, which is trustworthy only behind Vercel.
11. Sessions have a fixed lifetime (no sliding expiry), and `lastUsedAt` is
    refreshed at most every 5 minutes.
12. The login redirect target (`?next=`) is not implemented. If Phase 1 adds
    it, allow only same-origin `/app` paths to avoid an open redirect.

**Data**
13. `gallery.isEnabled` and `gallery.guestUploadsEnabled` default to `false` until
    organisers enable them.
14. Member invitations expire after 7 days (`MEMBER_INVITATION_TTL_DAYS`).
15. `expenseDate` is a date-only value in the API (`YYYY-MM-DD`) and stored as a
    `Date` at UTC midnight, matching DATABASE_DESIGN's type without timezone drift.
16. The DATABASE_DESIGN §91 photo listing indexes are kept alongside the
    lifecycle indexes that supersede them. Drop them once real query plans
    confirm they are unused.
17. Vendor `(weddingId, googlePlaceId)` uses a single partial unique index that
    serves both the lookup and the uniqueness rule.
18. `autoIndex` stays on in every environment, because unique indexes enforce
    correctness. At scale, move to an explicit index-migration step.
19. Outside production, `env.ts` rejects database names that look like production
    (`*-prod`, `production`).
20. Schemas use `strict: "throw"`, so writes with unknown paths fail loudly.
21. Slug format follows SYSTEM_DESIGN §27 (`brideName-groomName-ddmmyyyy`). Some
    doc examples put the groom first; confirm in Phase 1.

**Product and UI**
22. PRD §10's "Invitations" (under Guests) and "Guest Upload" (under Photos)
    have no separate pages in the target structure. They will live on the Guest
    List and Gallery pages.
23. `/w/[slug]` renders sample content (noindex, `?theme=` preview) until Phase 5.
24. `GET /api/health` always returns 200 while the app runs and reports
    `db: "down"` when MongoDB or its configuration is unavailable.
