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

## Phase 1 feature pass (2026-09-21) — deployed and verified live

Shipped and live at https://onweiapp.vercel.app / https://onweiapp-admin.vercel.app (commits
`a34c359`, `7b696e3`):

- **Homepage built from Figma** (`apps/web/app/page.tsx` + `apps/web/app/_components/*`), replacing
  the placeholder — real seeded Pickleball/Pilates product data in the grid via `@onwei/core`.
  Reusable `SiteHeader`/`SiteFooter`/`ProductCard`/`CategoryTile`.
- **Product browsing backend**: `packages/core/src/catalog/*` (list categories, list/get products,
  active/soft-delete/DRAFT/ARCHIVED filtering, in-stock derivation) — 18 tests against the real DB.
  Not yet wired into Collection/PDP pages (those still show placeholders — next up).
- **Dummy OTP login**, working end-to-end against production: `packages/core/src/otp/otpChallenge.ts`,
  `packages/auth/src/session/session.ts` (jose JWT cookie, explicit Redis placeholder),
  `apps/web/app/api/auth/{request,verify}-otp`, `apps/web/app/login`. Supports email or phone in one
  field. Deliberately excludes rate-limiting/blocklists/phone-format validation per earlier decision.
- **Newsletter capture is real**: new `NewsletterSubscriber` table (migration
  `20260921075951_add_newsletter_subscriber`), `packages/core/src/newsletter/subscribeToNewsletter.ts`,
  `apps/web/app/api/newsletter/subscribe`.
- **Two real bugs found via manual browser testing, not just CI** — worth remembering the pattern:
  (1) `ProductGridSection` was an async Client Component (React can't render those outside Next's RSC
  runtime) — fixed by fetching in the page and passing data down as a prop; (2) `NewsletterForm`'s
  submit button did nothing because `packages/ui`'s `Button` defaults to `type="button"` and the form
  never overrode it — **check every new `<Button>` inside a `<form>` explicitly sets
  `type="submit"`, the default will silently no-op otherwise.**
- **Corrections #15 — Turborepo cache path bug.** `turbo.json`'s `db:generate` task declared its
  `.prisma` engine-directory output as `node_modules/.prisma/**` (relative to `packages/database`),
  but npm workspace hoisting puts it at the repo root, exactly like the sibling `@prisma/client`
  output already correctly pointed to two levels up. This silently broke on the _first_ real cache
  hit in production: Vercel restored the cached `@prisma/client` package but not its generated
  engine, and everything importing it failed with `Cannot find module '.prisma/client/default'` —
  passed locally and on the previous (uncached) deploy, only surfaced once caching actually kicked
  in. Fixed to `../../node_modules/.prisma/**`. **If a future `db:*` or similar task output path is
  ever added, double-check it's relative to the task's package, not the repo root, and confirm
  against `find <repo root> -maxdepth 4 -type d -name .prisma` rather than assuming.**

### Known, disclosed gaps as of 2026-09-21 (superseded — see the 2026-09-22 pass below)

- Font approximation, missing mobile Homepage variant, and un-wired Collection/PDP pages were all
  flagged here as open. All three are now closed — see below.
- A LinkedIn icon glyph in the footer and one downloaded-but-unused asset (`icon-substack.svg`,
  ambiguous purpose in the source file) are minor loose ends, not investigated further.

## Figma rate-limit resolution + design-fidelity + catalog-wiring pass (2026-09-22) — deployed and verified live

Figma's Starter-plan tool-call rate limit (hit mid-build on 2026-09-21) turned out to be scoped to
the **file-owning team's** plan, not the accessing user's own team/account — a non-obvious finding.
The user duplicated the file into their own Pro-tier team's drafts, producing a new file key
(`kGG2vJdbqU6b1d1xmIhRwG`, replacing `3HCgSRca91P6WCpW28RA9o`) that is not rate-limited. All Figma
work from this pass on used the new key; node IDs are unchanged (duplication preserves them).

Shipped and live at https://onweiapp.vercel.app (commits `3481699`, `a6a0f56`, `efc8c65`):

- **Root-caused the font mismatch the user flagged as "completely different" from Figma**: it wasn't
  primarily the substitute font families, it was that headings/labels had **no `font-weight` applied
  at all**, rendering at the browser default (400) instead of Figma's actual Bold/Semibold/Medium
  cuts — confirmed node-by-node via `get_design_context`. Fixed by applying the correct Tailwind
  weight utility at every `font-display`/`font-grotesk` usage (verified per-instance against Figma,
  not applied uniformly). Also swapped `--font-grotesk` from Space Grotesk (not actually monospace)
  to IBM Plex Mono, since "ABC Monument Grotesk Mono" is a genuine monospace family — Space Grotesk
  was the wrong category of substitute, not just an imperfect match. Archivo (`--font-display`) and
  Caveat (`--font-script`) are kept; Raleway (`--font-cta`) was already confirmed exact.
- **Real Figma placeholder photo replaces the 7 generated flat-color SVGs** in
  `packages/database/prisma/seed.ts` — downloaded via `mcp__figma__download_assets` (the "RALLY PRO"
  paddle shot Figma itself reuses across every product card in the file). One shared image for every
  seeded product, matching Figma's own placeholder strategy rather than inventing per-SKU art.
- **Collection and PDP pages wired to the real catalog backend** (`apps/web/app/collection/[slug]`,
  `apps/web/app/product/[slug]`), built from Figma frames `760:3829` and `759:2979`. Collection:
  category tabs + heading/grid reusing `ProductCard`. PDP: gallery, title/price, a new client
  `ProductVariantPicker` (color/size chips driving live per-variant stock state), and Add to Cart
  rendered permanently disabled (cart is Phase 2, per the original plan's explicit PDP scope
  decision) plus the description block. Deliberately left out (no real data behind them, not
  invented): the power/spin/control slider, Materials & Care / Shipping accordions, the FAQ chat
  widget, the spec comparison table, the review wall, "you may also like", and — on Collection — the
  Homepage-duplicate marketing sections (reviews/newsletter/Instagram) further down that Figma page.
- **Mobile Homepage built** from the previously-unpulled node `761:4763`. Nav collapses to a
  decorative squiggle + logo + cart/account icons per Figma (the file has no menu UI at all in this
  state) — **by explicit user approval, the logo doubles as a menu trigger** opening a drawer
  (`MobileNav.tsx`) with the same links as desktop, since shipping a header mobile visitors can't
  navigate from isn't acceptable even though it'd be pixel-faithful. Every section's side padding
  now scales down for mobile (12px, matching Figma) instead of using the desktop `px-14` value
  unconditionally. Shop and Journal card grids became horizontal-scroll carousels on mobile
  (matching Figma's mobile pattern), same as Reviews/Instagram already were.
- **Fixed a real scroll-affordance bug, reported directly by the user against a screenshot**: every
  horizontal-scroll row showed the browser's native scrollbar instead of Figma's clean hidden-
  scrollbar look, and the decorative progress track under Reviews (`ReviewCarousel.tsx` now) was a
  static, non-functional bar that never moved. Added a `.no-scrollbar` utility (applied to every
  scroll row) and made the Reviews track a real client component that reflects actual scroll
  position via `onScroll`.
- Set the decorative squiggle icon as the site favicon (`apps/web/app/icon.svg`), per request.
- **Tooling limitation discovered**: `mcp__claude-in-chrome__resize_window` does not reliably
  resize the actual rendered viewport in this environment — `window.innerWidth` sometimes doesn't
  update at all, and when it does, there's a multi-call lag and it appears to floor out around
  ~500px rather than reaching an exact requested width like 390px. Mobile work in this pass was
  therefore built directly from the Figma spec (measurements + screenshots) without pixel-exact
  live-viewport confirmation, then spot-checked afterward at the ~500px width the tool did settle
  at, per explicit user direction. Get the user to check exact mobile rendering on a real device.
- Playwright is **not actually installed** in this repo, despite the 2026-09-21 entry above and the
  original plan text both saying otherwise (checked directly: no `playwright.config.*`, no `e2e/`
  directory, not in any `package.json`). No e2e tests exist. Correcting the record here so a future
  session doesn't assume test infrastructure that was never actually set up.

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

## Deployed (2026-09-21)

Two Vercel projects under the `onwei` team, both linked to `onweiweb/onweiapp` on GitHub (`main`
branch), both pointed at the same Neon database:

| Project          | Root Directory | URL                               |
| ---------------- | -------------- | --------------------------------- |
| `onweiapp`       | `apps/web`     | https://onweiapp.vercel.app       |
| `onweiapp-admin` | `apps/admin`   | https://onweiapp-admin.vercel.app |

`onweiapp` already had a Vercel Postgres/Neon marketplace integration connected (auto-injects
`DATABASE_URL` + the full `PG*`/`POSTGRES_*` var set) — that's the same database migrated earlier.
`onweiapp-admin` has `DATABASE_URL`/`DIRECT_URL`/`OTP_HASH_SECRET` set manually (no integration
attached to it). A Vercel API token (account `admin-15057788`, team `onwei`) is saved locally as
`VERCEL_TOKEN` in the repo root `.env` (gitignored) for any future project-config work — never used
via the shared/global `vercel` CLI session, always with an explicit `--token`/`Authorization` header.

**Corrections #14 — Turborepo strips undeclared env vars.** The first deploy attempt on both
projects failed with the same `DIRECT_URL` error seen locally, but from a different cause: Turbo's
strict env-var filtering silently drops any environment variable not declared in `turbo.json`, even
when it's correctly set on the Vercel project. Fixed by adding
`"globalEnv": ["DATABASE_URL", "DIRECT_URL", "OTP_HASH_SECRET"]` to `turbo.json`. Any _new_ env var
a package needs at build or runtime must be added to this list too, or Vercel builds will fail even
though the variable shows up correctly in the Vercel dashboard.

## Admin CMS build-out (2026-09-23), superseding the original "out of scope" call

The original plan's "Locked-in decisions" above said admin CMS feature screens were out of scope for
this scaffold. That was superseded in practice: a real, working `apps/admin` CMS shipped (commits
`9df1bcd`, `622ddcb`, `92ac287`) covering staff auth + RBAC, catalog/inventory, orders/returns,
coupons/discount rules, staff/roles management, review moderation and placement curation, compliance
(audit log, DSR, consent), and marketing content (value props, Instagram photos, marquee tickers).
Treat that locked-in decision as historical context for why the scaffold plan didn't originally
include it, not as current scope.

## Admin UX restructure (2026-09-24)

The admin sidebar had grown to 16 flat links and several pages stacked 3-4 independent forms/editors
vertically with no structure (`apps/admin/app/_components/ProductForm.tsx` alone was 350 lines in one
scroll). Fixed (commits `ca26aba`, `ae53f8d`):

- Sidebar nav grouped into 6 collapsible sections (Overview/Catalog/Sales/Marketing & content/People/
  Compliance), default-collapsed, expand state persisted per label via `localStorage` through
  `useSyncExternalStore` (`apps/admin/app/_components/AdminNav.tsx`), **not** `useState`+`useEffect`:
  `react-hooks/set-state-in-effect` (part of the newer eslint-plugin-react-hooks rule set this
  repo's `eslint-config-next` pulls in) flags that pattern as a lint error on `npm run build`'s
  pre-push hook.
- New shared primitives in `apps/admin/app/_components/ui/`: `AdminStepper` (linear wizard, gates
  "Next" on a per-step `canAdvance` flag) and `AdminTabs` (free-switching, no gating). `ProductForm`
  is now a 3-step wizard (Basics / Storefront content / Play characteristics); the product edit page,
  coupon edit page, and marketing-content page use `AdminTabs` instead of stacking sections.
- **Real bug fixed, not just cosmetic**: `AdminInput`/`AdminSelect`/`AdminTextarea` had
  `border-onwei-beige`, the same color as the page background most forms sit directly on (not every
  form is wrapped in a white `AdminCard`), so borders were invisible outside a card. Changed to
  `border-onwei-blue/25` everywhere those primitives are used.

## Review-placement fixes + newsletter add (2026-09-24, in progress, not yet committed)

User-reported: the PDP review-count "slider" didn't seem to work, and there was no way to add a
newsletter subscriber by hand. Root causes found by reading the actual code rather than guessing:

- `ReviewSurfaceConfig.surface` was globally `@unique`, so **one review-count limit applied to every
  product**: setting it from one product's "Featured reviews" tab silently changed every other
  product's PDP wall too. Migrated to `@@unique([surface, productId])` (migration
  `20260923111049_add_review_surface_config_product_override`, `productId` nullable; null rows are a
  surface's global default). `packages/core/src/catalog/listSurfaceReviews.ts`'s new
  `resolveSurfaceLimit()` does product-override, then global, then in-code-default fallback.
- **The "slider" was a plain `<input type="number">`, not a range slider**, and its handlers were
  already wired correctly end-to-end. Replaced with a real `AdminSlider` (`<input type="range">`)
  primitive showing a live "N of M approved reviews" readout, and removed the limit control entirely
  for `HOME_HERO` (the homepage hero always renders exactly one review; `TestimonialTile` in
  `apps/web/app/page.tsx` hardcodes index 0, so a slider that could move above 1 with no visible
  effect was itself the "doesn't work" complaint).
- Added a manual "add a subscriber" form + `POST /api/newsletter` to the previously 100%-read-only
  newsletter admin page, gated behind a new `newsletter:manage` permission (seeded into
  `PERMISSION_KEYS`). Reuses the existing `subscribeToNewsletter` core function the storefront's own
  signup already calls, no new business logic.
- Confirmed (not a bug): the scrolling bar right below "Have questions? Ask me" on the PDP is
  `MarqueeBar`, fed by the unrelated `MarqueeItem` model, never reviews. Content-page copy updated to
  say so explicitly.
- **`prisma migrate dev` does not work at all in this sandboxed shell** (no TTY; Prisma refuses
  non-interactive environments outright, even with `--create-only`). Workaround used and worth
  repeating: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
--script` to get the raw SQL (diffs the live DB against the target schema, no shadow DB needed),
  hand-write it into a normally-named `prisma/migrations/<timestamp>_<name>/migration.sql` folder,
  then `npx prisma migrate deploy` (which _is_ non-interactive-safe) to apply it and record it in
  `_prisma_migrations`. `prisma migrate diff --from-migrations ... --to-schema` (diffing against
  migration history instead of the live DB) additionally requires a `shadowDatabaseUrl` not configured
  here; `--from-config-datasource` sidesteps that by introspecting the real DB instead.
- **Prisma quirk**: a compound `@@unique` that includes a nullable field can't be queried via
  `findUnique`'s compound-key shorthand with a literal `null`. The generated
  `<Model><Fields>CompoundUniqueInput` type requires every field non-null, even ones the schema itself
  allows to be null. Querying the "global" (`productId: null`) row needs a plain `findFirst({ where: {
surface, productId: null } })` instead; the same restriction rules out `upsert` for that row too
  (had to become find-then-branch `create`/`update` by `id`, see `updateReviewSurfaceLimit` in
  `packages/core/src/reviews/reviewPlacement.ts`).

## Known open items (updated 2026-09-24)

- **Phase 1 (DB schema + OTP auth + product browsing) is functionally complete**, and a full admin CMS
  now exists well beyond original Phase 1 scope (see above). Remaining polish is exact-pixel mobile
  verification on a real device (see the resize-tool limitation above) and whatever client feedback
  comes back.
- OTP/SMS vendor and payment gateway remain open per `docs/OPEN_DECISIONS.md` — do not resolve
  without the user. **Phase 2 (cart/checkout/payments/coupons) cannot start until the payment
  gateway is confirmed**, and per root `CLAUDE.md` ground rule 1 needs a Plan Mode session first
  regardless (new schema, new dependency, touches payments/discounts).
- Newsletter campaign/content management (composing/sending an actual issue, not just subscriber
  list + manual add) is a new open decision, see `docs/OPEN_DECISIONS.md`.
- No e2e tests exist — Playwright is not installed in this repo (corrected from the earlier,
  inaccurate "installed but unused" note). Not blocking Phase 1; would matter more once Phase 2
  introduces state that's expensive to verify by hand (checkout, payment callbacks).
- `npm audit`'s 4 high-severity findings (see Corrections #13) — accepted risk, unreachable code path.

## Update discipline

Whenever new work changes any of the above (new dependency version constraints, new gotchas, new
open items), edit this file in the same batch of work — don't defer it to "later".
