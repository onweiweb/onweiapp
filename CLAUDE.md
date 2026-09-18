# CLAUDE.md

Read this before touching anything in this repo. If a one-off instruction in
chat conflicts with something here, ask — don't silently pick one.

## What this project is

A sports-clothing storefront (customer-facing) plus an internal CMS/admin app,
built as a Next.js monorepo. Two very different audiences share one codebase:
shoppers, who get the exact Figma-specced UI, and internal ops staff, who get a
plain, functional CMS UI with no set design system.

## Ground rules

1. **Plan Mode for anything non-trivial.** Before adding a feature, changing the
   database schema, adding a dependency, or touching auth, payments, or
   discounts, switch to Plan Mode (`Shift+Tab`, or this project's default —
   see `.claude/settings.json`), write a short plan (what changes, which files,
   any migration, any new env var), and wait for explicit approval. Typo fixes
   and work that's already inside an approved plan don't need a new round.
2. **Plain language in the CMS.** Admin labels, help text, empty states, and
   error messages must read like a colleague explaining what a button does —
   not a database field name. See `.claude/skills/cms-plain-language/`.
3. **No duplicated logic.** Anything both `apps/web` and `apps/admin` need —
   pricing, discount math, inventory rules, formatting — lives in
   `packages/core` (or the relevant shared package). Never copy-paste it.
4. **Every feature ships with tests.** New logic in `packages/*` needs unit
   tests. New API routes need an integration test for the happy path and the
   main failure path. See `docs/TEST_PLAN.md` for what's already expected.
   `npm run build` runs tests first (see Hooks) — don't bypass with `--no-verify`.
5. **Never commit secrets.** Real values go in `.env.local` (gitignored). Keep
   `.env.example` in sync when a new required variable is added.
6. **Follow the schema conventions in `docs/DATABASE_SCHEMA.md`** — soft
   deletes on customer-facing entities, price snapshots on order lines, an
   audit-log entry for admin actions that touch money, inventory, or access.
   Don't skip these for speed.
7. **Don't invent scope.** If a request implies a decision that isn't in
   `docs/OPEN_DECISIONS.md` or already approved, flag it instead of guessing.
8. **Never improvise storefront design.** `apps/web` follows Figma exactly —
   see `docs/OPEN_DECISIONS.md` for the Figma Dev Mode MCP connection. If the
   MCP isn't connected yet, or a specific screen/component genuinely isn't in
   the Figma file, stop and get explicit approval on the layout/design
   approach before writing UI for it. Don't fill the gap with a plausible-
   looking design and move on — `apps/admin` has no design system so this
   rule is `apps/web`-only.

## Tech stack (proposed — see docs/OPEN_DECISIONS.md for what's still open)

- Next.js, App Router, TypeScript (strict)
- Turborepo monorepo
- PostgreSQL + Prisma
- Redis (Upstash) — OTP throttling, sessions, caching
- Tailwind CSS + a small headless component layer
- Vitest + React Testing Library (unit/integration), Playwright (e2e)
- Payments: Razorpay is the leading candidate — **not yet finalized (placeholder)**; SMS/email OTP provider — **not yet confirmed**
- Hosting: Vercel; Vercel Postgres for data, Vercel Blob for images/uploads — confirmed
- Amazon reviews: paid third-party aggregation service (confirmed route; vendor not yet picked)
- Figma: Dev Mode MCP server connected live in Claude Code (not static exports)

## Repository layout

```
apps/
  web/      -> customer storefront (Figma-strict UI)
  admin/    -> internal CMS (plain design language, help-text-first)
packages/
  database/ -> Prisma schema + generated client — single source of truth for the DB
  core/     -> shared business logic: pricing, discount engine, inventory rules,
               order state machine. Framework-agnostic, heavily unit tested
  auth/     -> OTP issuance/verification, session handling, RBAC checks
  ui/       -> headless/shared primitives only (not themed) — each app layers
               its own look on top
  emails/   -> transactional email templates
  config/   -> shared eslint/tsconfig/tailwind config
docs/       -> architecture, schema rationale, test plan, security notes, open decisions
.claude/    -> Claude Code settings, hooks, project-specific skills
```

## Commands

- `npm run dev` — run both apps locally
- `npm run build` — runs `prebuild` (tests + typecheck) first, then builds both apps
- `npm test` — unit + integration tests across all packages
- `npm run lint` / `npm run typecheck`

## Where things live

| Feature | Lives in |
|---|---|
| Product browsing, PDP, cart, checkout | `apps/web` |
| Coupon / discount rule engine | `packages/core` |
| OTP signup/login, RBAC checks | `packages/auth` |
| Product/category/inventory/review admin | `apps/admin` |
| DB schema & migrations | `packages/database` |
| Order status timeline / tracking | `packages/core` (state machine) + `apps/web` (display) |

## Docs index

- `docs/ARCHITECTURE.md` — module boundaries, request flow, why the monorepo split
- `docs/DATABASE_SCHEMA.md` — entities, relationships, and the reasoning behind them
- `docs/TEST_PLAN.md` — required unit/integration/e2e cases by feature area
- `docs/SECURITY_AND_DPDP.md` — encryption, consent, data-subject rights
- `docs/OPEN_DECISIONS.md` — things still needing sign-off before Phase 1

## Current phase

**Phase 0 (this scaffold): planning + tooling only. No app code yet.**
Phase 1 (next, needs a go-ahead): DB schema finalized + OTP auth + product browsing.
Phase 2: cart/checkout/payments + coupons. Phase 3: reviews + admin CMS. Phase 4: analytics.
