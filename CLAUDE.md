# CLAUDE.md — Make My Marriage

Next.js 16 modular monolith for planning an Indian wedding together. The wedding is the tenant.
Architecture, route inventory and open decisions: `docs/CODEBASE_ARCHITECTURE.md`.

@AGENTS.md

## Commands

```bash
npm run dev               # Next dev server (needs .env.local; see README)
npm run lint              # ESLint 9 flat config (dependency rules live here)
npm run typecheck         # next typegen && tsc --noEmit
npm test                  # Vitest unit project (+ tests/architecture)
npm run test:integration  # Vitest + in-memory MongoDB replica set
npm run test:e2e          # Playwright smoke (npx playwright install chromium once)
npm run build             # production build
npm run format            # Prettier (never touches docs/, brand/, prompts/)
```

Definition of done for any change: lint, typecheck, test, test:integration and build all pass.

Project status: `docs/PROJECT_STATUS.md` tracks what is built and what is next. Read it when starting a
feature; update it (tables, open items, change log) when a feature lands. It is the one file in `docs/`
you may edit.

## Source of truth and precedence

`docs/PRD.md` (product scope), `docs/SYSTEM_DESIGN.md`, `docs/DATABASE_DESIGN.md`,
`docs/API_DESIGN.md`. Do not modify them, `brand/` or `prompts/`.
When they disagree: dated implementation notes (2026-09-16/18) → API_DESIGN → DATABASE_DESIGN →
SYSTEM_DESIGN for technical detail; the PRD wins on scope; the binding decisions in
`docs/CODEBASE_ARCHITECTURE.md` §11 override all of them. The dated notes describe an earlier
implementation that is NOT in this repo — treat them as requirements, don't look for that code.

## Non-negotiable rules

1. **Thin handlers.** Every `src/app/api/**/route.ts` export is `route({ auth, params, query, body, handler })`
   from `@/server/http`. The handler calls one module service and wraps the result. Route files import
   only `@/server/http`, `@/modules/<m>` (index) and `@/modules/<m>/<m>.schemas`.
2. **Wedding context only from the session** (`ctx.weddingId` from `auth: "member" | "admin"`). Never
   accept `weddingId` from the client; strict Zod schemas reject it.
3. **Every query is scoped by `weddingId`.** Repositories take `weddingId` first. The tenant-guard
   plugin throws on unscoped queries; `.setOptions({ tenantScoped: false })` is allowed ONLY for
   token/slug resolution, identity resolution and the email worker.
4. **Cross-tenant access returns 404 NOT_FOUND, never 403.** Validate referenced ids (event, member,
   vendor) through the owning module's service.
5. **Never log secrets:** passwords, session/reset/invite/guest/gallery tokens, signed URLs. Use
   `logger` from `@/server/logging/logger`, not `console`.
6. **Money is integer paise** (`amountPaise`). Format with `formatINR` from `@/lib/money`.
   Wedding date is `YYYY-MM-DD` + IANA `timeZone`; instants are UTC (`@/lib/dates`).
7. **Strict Zod at every boundary:** every request schema is `.strict()`; enums come from `*.constants.ts`.
8. **Internal services, never provider SDKs:** `getEmailService()`, `getStorageService()`,
   `getVendorDiscoveryService()`. No `resend` or `@aws-sdk/*` imports outside `src/server`.
9. **Mutations go through REST.** No Server Actions for writes. Server Components may read via services.
10. **Tokens:** `generateToken()` / `hashToken(purpose, raw)` from `@/server/security/tokens`; never
    `Math.random`. Session, reset and member-invite tokens are stored as HMAC only. Guest invitation and
    gallery tokens are stored raw with `select: false` and never appear in CRUD responses.

## Layering

```
src/app        routing only            → may use modules (index) + server
src/modules    domain (one per context) → may use server/*, other modules' index.ts, their constants/schemas/types
src/server     infrastructure          → never imports modules or UI (use a port + src/composition-root.ts)
src/features, src/components, src/themes, src/lib  client/isomorphic → only *.constants/*.schemas/*.types from modules
```

- Every server-only file starts with `import "server-only";` (architecture test enforces it).
- Module anatomy: `x.constants.ts`, `x.schemas.ts`, `x.types.ts` (isomorphic); `x.model.ts`,
  `x.repository.ts`, `x.service.ts`, `x.mapper.ts`, `index.ts` (server-only); co-located `*.test.ts`.
- Services: `async op(ctx, …)`, throw `AppError("CODE")`, return DTOs from the mapper (strip secrets).
- Updates to events, tasks and guests are conditional on `__v` (mismatch → `CONFLICT`).
- Use `withTransaction` only for create-wedding + ADMIN membership and accepting a member invitation.

## Next.js 16 specifics (read node_modules/next/dist/docs before changing patterns)

- Cache Components is on: request-time reads (cookies, session, `new Date()`) go inside `<Suspense>`;
  `getCurrentContext()` already awaits `connection()`.
- `params`, `searchParams` and `cookies()` are async. `src/proxy.ts` replaces middleware (Node runtime).
- Only one `next dev` per directory. Builds output to `.next`, dev to `.next/dev`.

## Adding an endpoint

Inventory row (`tests/architecture/api-inventory.ts`) → `.strict()` schemas → service + repository
(weddingId first) + mapper → `route()` export → tests (including a cross-wedding 404 case) → client hook in
`src/features/<domain>`. Details: `docs/CODEBASE_ARCHITECTURE.md` §15.

## Phases (PRD §16)

1 Foundation (auth, wedding, members, dashboard) · 2 Planning (events, tasks) · 3 Guests (guests,
invitations, RSVP, email jobs) · 4 Financial & Vendors · 5 Wedding Experience (website, themes,
livestream, covers) · 6 Memories (gallery, photos, QR) · 7 Production readiness.
Stubbed endpoints answer 501 `NOT_IMPLEMENTED` with their phase; services throw `notImplemented("§ref")`.
