# Make My Marriage

A web app that lets an Indian family plan a wedding together: events, tasks, guests and RSVPs,
expenses, vendors, a wedding website, a livestream and a shared photo gallery. Guests never need
an account.

This repository is a **production-grade scaffold**: the architecture, infrastructure, every data
model and the complete API surface are in place. Product features land phase by phase (see
[Roadmap](#roadmap)).

- Product: [`docs/PRD.md`](docs/PRD.md)
- System design: [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md)
- Database: [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md)
- API: [`docs/API_DESIGN.md`](docs/API_DESIGN.md)
- **Codebase architecture, route inventory and open decisions:** [`docs/CODEBASE_ARCHITECTURE.md`](docs/CODEBASE_ARCHITECTURE.md)
- Working agreement for AI assistants: [`CLAUDE.md`](CLAUDE.md)

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript (strict) · MongoDB
Atlas + Mongoose · Zod · custom sessions (argon2id) · Cloudflare R2 · Resend · Google Places ·
Tailwind CSS 4 + shadcn/ui · TanStack Query · Vitest · Playwright · Vercel (+ Cron)

## Getting started

### 1. Prerequisites

- **Node 22 LTS** (`nvm use` reads `.nvmrc`) and npm
- **MongoDB as a replica set.** Transactions (create wedding, accept invitation) need one. Pick one:
  - **Atlas (recommended):** create a separate free _development_ cluster. Atlas clusters are
    replica sets. Never point development at the production database. `env.ts` rejects
    production-looking database names outside production.
  - **Local:** run `mongod` as a single-node replica set:

    ```bash
    mongod --replSet rs0 --dbpath ./.mongo-data --port 27017
    ```

    then, once, from another terminal:

    ```bash
    mongosh --eval "rs.initiate()"
    ```

### 2. Install and configure

```bash
npm ci
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Every variable is documented in [`.env.example`](.env.example). For local
development you need only:

| Variable              | Value                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000`. Browse via this exact origin: mutations check `Origin`.                   |
| `MONGODB_URI`         | your dev replica set, e.g. `mongodb://127.0.0.1:27017/make-my-marriage-dev?replicaSet=rs0`         |
| `SESSION_SECRET`      | 32+ random bytes: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

Without integration keys, development falls back safely. Emails print to the terminal (console
adapter), storage uses an in-memory fake, and vendor discovery returns sample results. In
production every integration key is required: environment validation fails, and requests that need
configuration error, until they are all set.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000. `GET /api/health` reports `{ "status": "ok", "db": "up" | "down" }`.

## Scripts

| Script                            | What it does                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                     | Next.js dev server                                                                |
| `npm run build` / `npm start`     | Production build / server                                                         |
| `npm run lint`                    | ESLint (includes the dependency-rule fences)                                      |
| `npm run typecheck`               | `next typegen` + `tsc --noEmit`                                                   |
| `npm run format`                  | Prettier write (`format:check` to verify)                                         |
| `npm test` / `npm run test:watch` | Vitest unit project (co-located tests + architecture checks)                      |
| `npm run test:integration`        | Vitest against an in-memory MongoDB replica set (downloads `mongod` on first run) |
| `npm run test:e2e`                | Playwright smoke tests. Run `npx playwright install chromium` once first.         |

All scripts work in Windows PowerShell and Linux CI. CI (`.github/workflows/ci.yml`) runs install →
lint → typecheck → unit tests → integration tests → build.

## Deployment (Vercel)

- Set every variable from `.env.example` in the Vercel project, using separate credentials per
  environment. Preview deployments need their own database and bucket.
- `vercel.json` schedules `GET /api/internal/jobs/email` every 5 minutes. Vercel sends
  `Authorization: Bearer $CRON_SECRET`.
  **The allowed cron frequency depends on your Vercel plan.** Lower plans restrict how often cron
  jobs may run, so check Vercel's current cron limits before deploying and widen the schedule if
  needed. Bulk email simply processes more slowly.
- R2: a private bucket, bucket-scoped credentials, and CORS allowing `PUT`/`GET`/`HEAD` with
  `Content-Type` from the app origins.

## Project layout

```text
src/app         routing only (pages, layouts, route handlers)
src/modules     domain modules: auth, weddings, members, events, tasks, guests, expenses, vendors,
                photos, dashboard, email-jobs
src/server      infrastructure: config, db, http (route()), auth, security, errors, email, storage,
                places, logging
src/features    client UI per domain · src/components · src/themes · src/lib (isomorphic utils)
tests           setup, architecture, integration, security, e2e
```

Details, dependency rules and the full route table are in
[`docs/CODEBASE_ARCHITECTURE.md`](docs/CODEBASE_ARCHITECTURE.md).

## Roadmap

From PRD §16. Every API route already exists. Unbuilt ones answer `501 NOT_IMPLEMENTED` naming
their phase.

| Phase                  | Scope                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| ✅ Scaffold            | Architecture, infrastructure, all models and indexes, full API route map, page stubs, tests |
| 1 Foundation           | Authentication, wedding creation, Wedding Members, dashboard                                |
| 2 Planning             | Events, tasks                                                                               |
| 3 Guests               | Guest management, invitations, RSVP, email (bulk jobs + cron), WhatsApp sharing             |
| 4 Financial & Vendors  | Expense tracker, My Vendors, vendor discovery                                               |
| 5 Wedding Experience   | Wedding website + themes, YouTube livestream, cover images                                  |
| 6 Memories             | Gallery, guest photo uploads, albums, private sharing, QR code                              |
| 7 Production readiness | Error handling, security review, responsive design, performance, analytics, monitoring      |
