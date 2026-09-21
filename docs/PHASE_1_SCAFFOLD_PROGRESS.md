# Phase 1 scaffold — progress & continuity log

Read this file first when resuming work on the monorepo scaffold, whether in a fresh session or
after context compaction. It is the source of truth for "what's actually done" — trust this over
recollection. Update the checklist and this file every time a section below is completed or a fact
changes. Do not let this file drift out of sync with the working tree.

Full plan lives at `/Users/apple/.claude/plans/great-figma-seems-to-harmonic-hinton.md` (approved
2026-09-20). This file tracks _status_, and now-corrected details the plan got wrong along the way.

## Status: scaffold complete and verified (2026-09-20)

`npm run dev` (web on :3000, admin on :3001), `npm run typecheck`, `npm run test`, `npm run lint`,
and `npm run build` all pass clean across all 8 workspaces. The first Prisma migration
(`20260920052205_init`) is applied to a real Neon database. Nothing below is aspirational.

## Locked-in decisions (do not re-litigate; re-ask the user only if one needs to change)

- Build order: monorepo skeleton first, Figma-to-code per screen is separate follow-on work.
- `apps/web` gets route stubs only this pass (placeholder + `// TODO: Figma frame <id>` comment) —
  no styled Homepage build-out yet.
- OTP/SMS vendor undecided (see `docs/OPEN_DECISIONS.md`). `packages/auth` ships an `OtpSender`
  interface + `ConsoleOtpSender` dev stub only. No real vendor call anywhere.
- Payment gateway, discount engine, reviews, admin CMS feature screens: out of scope. Interface
  stubs only where architecture doc calls for them (`PaymentProvider`, `ProductSearchIndex`).
- Figma file key: `3HCgSRca91P6WCpW28RA9o`. Dev-ready screens (frame id → name): `758:2218` Homepage
  desktop, `761:4763` Homepage mobile, `759:2979` PDP, `760:3829` Collection, `760:4492` About Us.
  No login/OTP or cart/checkout screens exist in Figma yet — don't invent them.
- Database: Neon Postgres (via Vercel Postgres marketplace integration). Connection strings live in
  `packages/database/.env` (gitignored, never committed) — `DATABASE_URL` (pooled, PgBouncer, used
  by the app at runtime) and `DIRECT_URL` (non-pooled, used only by the Prisma CLI for migrations).

## Real dependency versions installed (not the plan's original guesses — see "Corrections" below)

| Package                           | Version               | Note                                                                                    |
| --------------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| next                              | 16.3.5                | Turbopack                                                                               |
| react / react-dom                 | 19.3.0                |                                                                                         |
| prisma / @prisma/client           | ^7.10.0               | `npm` `latest` tag pointed at `8.0.0-rc.15` (an RC) — pinned to `prev` (7.10.0) instead |
| @prisma/adapter-pg, pg            | ^7.10.0 / ^8.23.0     | required — Prisma 7 dropped schema.prisma `url`/`directUrl`, see Corrections            |
| tailwindcss                       | 4.3.3                 | CSS-first `@theme` config, no `tailwind.config.js`                                      |
| vitest                            | 5.0.1                 |                                                                                         |
| @vitejs/plugin-react              | ^6.1.1                | required in apps/web, apps/admin — see Corrections                                      |
| @playwright/test                  | 1.63.0                | installed, not yet used (no e2e tests written)                                          |
| typescript                        | **^6.0.3**, not 7.x   | see Corrections                                                                         |
| eslint                            | **^9.39.5**, not 10.x | see Corrections                                                                         |
| eslint-config-next                | 16.3.5                | imported directly (`eslint-config-next/core-web-vitals`), no FlatCompat                 |
| typescript-eslint                 | 8.70.0                |                                                                                         |
| jsdom                             | **^29.1.1**, not 30.x | see Corrections; must be hoisted to root, see Corrections                               |
| @testing-library/react / jest-dom | 16.3.3 / 7.0.1        |                                                                                         |

## Corrections made during implementation (read before touching these areas again)

1. **TypeScript pinned to ^6.0.3, not latest (7.0.2).** `typescript-eslint@8.70.0` peer-depends on
   `typescript >=4.8.4 <6.1.0`. Installing TS 7 breaks `npm install` (ERESOLVE). Don't bump
   TypeScript past 6.0.x until typescript-eslint publishes support for 6.1+/7.x.
2. **ESLint pinned to ^9.39.5, not latest (10.11.0).** `eslint-plugin-react@7.37.5` (pulled in by
   `eslint-config-next`) still calls `context.getFilename()`, an API ESLint 10 removed — this
   crashes every lint run on any `.tsx` file. `eslint-plugin-react` doesn't support ESLint 10 yet.
   Don't bump ESLint past 9.x until it does.
3. **`eslint-config-next` is imported directly, not through `@eslint/eslintrc`'s `FlatCompat`.**
   `eslint-config-next@16.3.5` already ships a native flat-config array
   (`eslint-config-next/core-web-vitals`). Routing it through `FlatCompat` (the old
   eslintrc-bridging approach) crashes with "Converting circular structure to JSON" under
   ESLint 10 and is simply unnecessary now. `@eslint/eslintrc` was removed as a dependency.
4. **Prisma 7 removed `url`/`directUrl` from schema.prisma's datasource block entirely.**
   Connection strings now live in `packages/database/prisma.config.ts` (CLI/migrations —
   `datasource.url`, set to `DIRECT_URL`) and are passed to `PrismaClient` at runtime via a driver
   adapter (`@prisma/adapter-pg`'s `PrismaPg`, constructed with `DATABASE_URL`) in
   `packages/database/src/client.ts`. schema.prisma's datasource block is now just
   `{ provider = "postgresql" }`. This is the same pattern already used in the House of Swasa repo
   per the parent workspace's CLAUDE.md.
   - `prisma.config.ts` explicitly loads `packages/database/.env` itself via Node's
     `process.loadEnvFile()` — Prisma 7's own config-loading did not reliably pick it up
     automatically in this setup.
5. **jsdom pinned to ^29.1.1, not latest (30.1.0), and must be a _root_ devDependency.**
   jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`; this machine runs Node 24.12.0, just
   below that. Separately, npm workspaces did not hoist jsdom to root when it was only declared in
   `packages/ui`/`apps/web`/`apps/admin` — Vitest's own code does a dynamic `import('jsdom')` from
   _its_ install location (root `node_modules`), which fails if jsdom only exists nested in a leaf
   workspace. jsdom must stay declared in root `package.json` devDependencies too.
6. **`packages/ui`'s tsconfig must NOT extend `tsconfig/nextjs.json`.** That preset sets
   `jsx: "preserve"` (correct for Next's own SWC build, wrong for a plain library). It now extends
   `tsconfig/base.json` directly with `jsx: "react-jsx"`.
7. **`apps/web` and `apps/admin` need `@vitejs/plugin-react` in their `vitest.config.ts`.** Their
   tsconfig's `jsx: "preserve"` (correct for Next's SWC build) leaves JSX unprocessed for Vitest's
   own standalone transform, causing a parse failure. The plugin compiles JSX independently of that
   tsconfig setting.
8. **Every `vitest.setup.ts` (packages/ui, apps/web, apps/admin) calls `cleanup()` in `afterEach`
   explicitly** (`@testing-library/react`'s `cleanup`) — RTL's automatic cleanup only self-registers
   when `afterEach` is a true global, which isn't the case here (no `test.globals: true`).
9. **All shared config in `packages/config` (eslint/base.js, eslint/next.js, and every package's own
   `eslint.config.js`) is real ESM (`import`/`export default`), and every workspace `package.json`
   has `"type": "module"`.** The original CJS (`require`/`module.exports`) versions tripped
   `@typescript-eslint/no-require-imports` (a real lint error, not a suppressible edge case) once
   `typescript-eslint`'s recommended rules applied to the config files themselves.
10. **`turbo.json`'s `db:generate` task outputs `../../node_modules/@prisma/client/**`, not a path
    under `packages/database/node_modules`** — npm workspace hoisting puts the generated client at
    the repo root, two levels up from `packages/database`.
11. **`packages/database/package.json` has no `"build"` script.** Every internal package ships raw
    TypeScript source (`main`/`types` point at `src/index.ts`); Next's `transpilePackages` config in
    `apps/web`/`apps/admin` compiles them on demand. No separate build step exists for these packages.
12. **`OTP_HASH_SECRET` was added to `.env.example`** (not in the original plan) — `hashOtpCode()` in
    `packages/auth` HMACs the OTP code with a required server-side secret (a plain hash of a 6-digit
    code is trivially brute-forced offline), so this is a real required env var, not a nice-to-have.
13. **`npm audit` reports 4 high-severity findings** — all inside `prisma`'s own MySQL-driver support
    code (`mysql2`, `deepmerge-ts`), unreachable since this project is Postgres-only. Not fixed
    (fixing requires downgrading to `prisma@6.19.3`, undoing the Prisma 7 migration for no real
    safety gain). Revisit only if Prisma ships a 7.x patch.

## Section checklist — all done

- [x] Plan approved (2026-09-20)
- [x] A — root scaffolding (tsconfig.json, .env.example incl. DIRECT_URL + OTP_HASH_SECRET, ci.yml,
      package.json/turbo.json edits, `packageManager` field added — turbo 2.11+ requires it)
- [x] B — packages/config
- [x] C — packages/database (client + adapter-pg + prisma.config.ts; migration applied — see below)
- [x] D — packages/core, packages/auth, packages/ui, packages/emails — all with real, passing tests
- [x] E — apps/web, apps/admin — route stubs, both boot and build
- [x] F — npm install, husky hooks written (`.husky/pre-commit`, `.husky/pre-push`)
- [x] G — verification: dev ✓ (curled both ports, got 200 + expected content), typecheck ✓, test ✓
      (all real tests pass, only the DB-integration test's skip/run is env-conditional), lint ✓,
      build ✓ (both apps, Turbopack, static pages generated)
- [x] H — first Prisma migration `20260920052205_init` applied to the real Neon database; confirmed
      via `prisma migrate status` ("Database schema is up to date!") and the integration test
      (`client.integration.test.ts`) passing against the live connection.

## Known open items (unchanged, still real)

- Figma pull for actual screen styling (Homepage/PDP/Collection/About) is deliberately deferred to
  a follow-on pass, not part of this scaffold.
- OTP/SMS vendor and payment gateway remain open per `docs/OPEN_DECISIONS.md` — do not resolve
  without the user.
- No e2e tests written yet despite Playwright being installed.
- `npm audit`'s 4 high-severity findings (see Corrections #13) — accepted risk, unreachable code path.

## Update discipline

Whenever new work changes any of the above (new dependency version constraints, new gotchas, new
open items), edit this file in the same batch of work — don't defer it to "later".
