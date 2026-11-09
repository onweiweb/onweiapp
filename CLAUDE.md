# CLAUDE.md

Read this before touching anything in this repo. If a one-off instruction in
chat conflicts with something here, ask, don't silently pick one.

## What this project is

A sports-clothing storefront (customer-facing) plus an internal CMS/admin app,
built as a Next.js monorepo. Two very different audiences share one codebase:
shoppers, who get the exact Figma-specced UI, and internal ops staff, who get a
plain, functional CMS UI with no set design system.

## Ground rules

1. **Plan Mode for anything non-trivial.** Before adding a feature, changing the
   database schema, adding a dependency, or touching auth, payments, or
   discounts, switch to Plan Mode (`Shift+Tab`, or this project's default,
   see `.claude/settings.json`), write a short plan (what changes, which files,
   any migration, any new env var), and wait for explicit approval. Typo fixes
   and work that's already inside an approved plan don't need a new round.
2. **Plain language in the CMS.** Admin labels, help text, empty states, and
   error messages must read like a colleague explaining what a button does,
   not a database field name. See `.claude/skills/cms-plain-language/`.
3. **No duplicated logic.** Anything both `apps/web` and `apps/admin` need,
   pricing, discount math, inventory rules, formatting, lives in
   `packages/core` (or the relevant shared package). Never copy-paste it.
4. **Every feature ships with tests.** New logic in `packages/*` needs unit
   tests. New API routes need an integration test for the happy path and the
   main failure path. See `docs/TEST_PLAN.md` for what's already expected.
   `npm run build` runs tests first (see Hooks), don't bypass with `--no-verify`.
5. **Never commit secrets.** Real values go in `.env.local` (gitignored). Keep
   `.env.example` in sync when a new required variable is added.
6. **Follow the schema conventions in `docs/DATABASE_SCHEMA.md`**, soft
   deletes on customer-facing entities, price snapshots on order lines, an
   audit-log entry for admin actions that touch money, inventory, or access.
   Don't skip these for speed.
7. **Don't invent scope.** If a request implies a decision that isn't in
   `docs/OPEN_DECISIONS.md` or already approved, flag it instead of guessing.
8. **Never improvise storefront design.** `apps/web` follows Figma exactly,
   see `docs/OPEN_DECISIONS.md` for the Figma Dev Mode MCP connection. If the
   MCP isn't connected yet, or a specific screen/component genuinely isn't in
   the Figma file, stop and get explicit approval on the layout/design
   approach before writing UI for it. Don't fill the gap with a plausible-
   looking design and move on, `apps/admin` has no design system so this
   rule is `apps/web`-only.

## Frontend implementation gotchas (apps/web)

Learned the hard way while building out the Collection and About Us pages,
read before assuming something that looks broken is a missing asset.

- **Figma exports bake in ancestor backgrounds.** An SVG export of a
  decorative node from the Dev Mode MCP often embeds a flat placeholder rect
  (`#D4D4D4`), the full page background, and the local frame's background as
  leading `<rect>` elements before the actual artwork. Invisible when the
  asset happens to sit on a matching-color section, but shows as a visible
  box the moment it's placed over a photo. Strip every leading `<rect>`
  before the real content group. PNG raster exports have the same failure
  mode as an oversized canvas with the real asset shrunk into a corner,
  re-export tightly cropped to the node's own bounds instead of trusting the
  first export.
- **`next/image` lazy-loading blind spot inside horizontal scroll.** Default
  lazy loading uses an IntersectionObserver against the browser viewport,
  which never fires for an element positioned off-screen to the _right_
  inside an `overflow-x-auto` row. It stays blank until the row is scrolled
  far enough to bring it on-screen. Set `loading="eager"` on any image that
  can sit inside a horizontally-scrolling row.
- **`overflow-x-auto` alone forces `overflow-y: auto` too** (CSS Overflow
  spec: an axis left `visible` while the other isn't computes to `auto`).
  This clips any absolutely-positioned decoration that intentionally hangs
  outside its own box, a common Figma pattern, if that decoration is a
  descendant of the scroll container. Either pad the scroll container to
  give the overhang room, or pull the decoration out as a sibling instead of
  a child.
- **Next.js dev image cache lives at `apps/web/.next/dev/cache/images`**
  (not the classic `.next/cache/images`). Replacing a static file under
  `public/` and still seeing the old version after a hard reload means this
  cache is stale, not the browser, delete the directory.
- **Figma layer/text names can be stale.** A text node's `name` in Dev Mode
  MCP metadata sometimes reflects an earlier duplicated layer, not its
  current content (a reviews heading named "Transform Your Health" actually
  read "Chosen by 1000+ everyday movers" on screen). Confirm with an actual
  screenshot before trusting a metadata dump.
- **Shared horizontal-scroll UI** lives in
  `apps/web/app/_components/ScrollCarousel.tsx` (progress-track + thumb, not
  a native scrollbar), reuse it for any new scrolling row instead of a bare
  `overflow-x-auto` div.

## Standing conventions (added 2026-09-30 audit)

- No em dash (long dash) anywhere: code, comments, UI copy, docs, seed data. Use a comma, period, or two sentences.
- Rate limits use `createLazyLimiter` (`packages/core/src/rateLimit/lazyLimiter.ts`), not a fresh Upstash setup.
- Admin lists page with `apps/admin/app/_lib/pagination.ts` plus `AdminPager`, never a bare `take: N`.
- State changes (orders, and later shipments, payments, invoices) use a transaction with a compare-and-set
  on the old status, and write history and audit rows in the same transaction.
- Orders, checkout, payments, coupons and returns are built (see `docs/COMMERCE_BUILD_PLAN.md`). GST invoicing,
  delivery partner and CRM are deliberately not built yet and have no answers. Do not start them or add schema for them
  without an approved plan.

## Databases and migrations (added 2026-10-01)

- Local and production use DIFFERENT databases. Never infer they match from
  `.env` files: every local env file points at the dev DB, and prod values live
  only in Vercel project env vars. Do not claim "shared DB" without seeing both.
- The Prisma CLI reads `DIRECT_URL` (see `packages/database/prisma.config.ts`),
  not `DATABASE_URL`. A plain `prisma migrate deploy` only migrates the dev DB.
- After any schema change, the prod DB must be migrated before or with the
  push, or the deployed code fails on the missing column. Ask the user for the
  prod `DIRECT_URL` (never paste or print it) and have them run
  `DIRECT_URL="<prod>" npx prisma migrate deploy` from `packages/database`.
- Vercel builds skip DB integration tests (`packages/config/vitest/base.ts`
  clears `DATABASE_URL` when `VERCEL` is set). Run `npm test` locally for those.
- Root `prebuild` was removed: `turbo build` already depends on `test` and
  `typecheck`, so it ran everything twice.

## Dev DB is free to change, prod is waitlist-only (added 2026-10-12, updated 2026-10-13)

- Owner confirmed: the dev DB (every local `.env*`) can be freely changed for testing, for example flipping
  `SiteSetting.siteMode` to LIVE to see gated pages, reseeding, or trying schema changes. Local dev runs in
  LIVE mode for the non-waitlist build-out. Never read or print waitlist entries or other customer personal data, even
  from the dev DB, use counts only.
- Prod stays in WAITLIST mode while signups are open, so the whole storefront (Homepage, collection, product,
  journal) is gated behind `/ontheway` by `proxy.ts`. The Figma audit pass was pushed to `main` on 2026-10-13
  (commit 6782342) at the owner's request: the code is live but hidden. Flipping prod to LIVE is the owner's call
  (admin Settings, site mode), and the first look after the flip is the real check because collection, product and
  journal pages are prebuilt. Push to `main` only when asked, and run no prod migration without the owner.
- Figma differs per page for the header nav, newsletter headline and Instagram note/arrow, use the `SiteHeader nav`,
  `SiteFooter desktopHeading` and `InstagramGrid` position props, not one shared copy. Capture screenshots per section
  after scrolling (full-page captures miss lazy images and SVGs). Details in `docs/FIGMA_AUDIT.md`.
- Audit standard for `apps/web` against Figma: every illustration, artwork, image, button and copy line must
  match the frame exactly, at desktop and mobile widths. Compare live screenshots section by section, not by
  reading code.

## Admin conventions (added 2026-10-21)

- Every admin page starts with `PageHeader` (title, description, back link, one primary action). Empty lists use
  `EmptyState`, form fields use `Field`, link-looking buttons use `LinkButton`. No `neutral-*` classes, raw `<table>`s or
  raw inputs, use the kit in `apps/admin/app/_components/ui`.
- Confirmations and success or error messages go through `useConfirm()` and `useToast()`, never `window.confirm` or `alert`.
- Get the signed-in staff member with `getCurrentStaff()` (`app/_lib/session.ts`) or `requirePageSession()`. Both share one
  cached lookup per request, do not add new per-page staff or permission queries.
- Pages with sections use URL tabs (`AdminTabLinks`, `?tab=`) and load only the open tab's data. A page has no `loading.tsx` of
  its own unless it needs a special one, the root `app/loading.tsx` covers it.
- Edit forms keep Save disabled until a field changes: keep a `baseline` in `useState` (not `useRef`, lint forbids reading refs in
  render), compare a JSON snapshot, update the baseline after a successful save.
- Saving site settings pings the storefront to revalidate (`triggerCatalogRevalidate("site-setting")`). Anything else the web app
  caches that admin edits should be revalidated the same way.
- Products and other customer-facing rows are soft deleted. Admin lists, inventory and counts must filter `deletedAt: null`.
- A product with no photo shows the shared backup tile (`ProductImage` in web, `SafeImage` in admin). Never seed placeholder
  photo rows.
- Blog analytics events go through `TrackedLink` (typed events in `apps/web/lib/analytics/events.ts`). Admin Visitors has a
  "Blog posts" report (`getBlogReport`).
- The admin has no Figma, dropdown chevron and pointer cursor are global CSS in `apps/admin/app/globals.css`.

## Responsive system (added 2026-10-01)

- `1rem` is fluid (see `apps/web/app/globals.css`). Desktop (>= 768): 1440px frame = 16px, scales
  with viewport width up to 1440, then holds at 16px and content is capped (90rem) and centered. Mobile (< 768): 390px frame
  = 16px, bounded 13 to 18px. So every size in `apps/web` is rem, never raw px (1px hairlines only).
- One mobile/desktop switch: the `desk:` breakpoint (768). `sm/md/lg/xl/2xl` are removed on purpose.
  Use `max-desk:` for "below desk" overrides on elements whose base class sets `display`.
- Use `@/_components/ScaledImage` instead of `next/image` directly. It sizes `width={N}` in rem so
  logos and decorations scale with the layout.
- Decorations (arrows, underlines, stamps) must show at every width. Where a mobile Figma frame exists
  (Homepage 761:4763, About, Waitlist) copy its absolute offsets (left as %, top in rem). Collection has
  no mobile frame, its hero decorations are a scaled adaptation of the desktop frame.
- Text floors: `text-[length:max(Nrem,11px)]` keeps small copy readable when the desktop layout is
  scaled down (tablet and 150% zoom).
- Check with `npm run test:e2e` (`e2e/responsive.spec.ts`): 12 widths, overflow assertions, screenshots in
  `e2e/shots/` (gitignored). Dev DB must be in LIVE site mode for non-waitlist pages.

## Visitor analytics (added 2026-10-07)

PostHog Cloud (US, project 649503), cookieless. The storefront sends events, our DB stores
attribution on signups, the admin `/analytics` page reads reports back. Full privacy notes are in
`docs/SECURITY_AND_DPDP.md` ("Visitor analytics").

- **Send side (`apps/web`):** `AnalyticsProvider` (mounted in the root layout) boots PostHog after
  first paint and sends pageviews by hand so the first one already carries `page_type`, `visit_id`
  and first-touch `ft_utm_*` / `ft_referrer_host`. Events go through the same-origin `/ingest`
  rewrite (`next.config.ts`; `proxy.ts` lets `/ingest` through the waitlist gate and keeps the query
  string when it redirects, so tagged links keep their UTMs). Nothing loads if
  `NEXT_PUBLIC_POSTHOG_KEY` is unset, which is why local dev stays quiet unless it is added.
- **Add an event:** declare it in `apps/web/lib/analytics/events.ts` first (typed), then call
  `track()` or use `<TrackView>`. **Never send anything a visitor typed.** Forms use
  `useFormTracking(name, FIELDS)` with a module-level constant fields array.
- **Read side:** `packages/core/src/analytics/` (`posthogClient`, `queries`, `attribution`,
  `utmBuilder`, `sourceLabels`). Queries are HogQL sent on ONE line (`runHogql` collapses
  whitespace: multi-line copies silently dropped rows on PostHog's side). Filter by
  `properties.environment`; use `properties.visit_id`, not `$session_id` (cookieless mode).
- **Admin (`apps/admin/app/analytics`):** reports are cached 60s in production via
  `unstable_cache` (`_data.ts`, the only cache; core has none), no caching at all in `next dev`.
  Each report returns `{ data, fetchedAt }` so the page can show when PostHog was really asked.
  The "Refresh numbers" button clears the cache, limited to 6 per minute per staff member. Gated by
  `waitlist:view`. Link builder at `/analytics/links` (fixed channel list in `utmBuilder.ts`, page
  picker includes active products, campaign field suggests names already used on signups).
  Every link made is saved in `TrackedLink` (upsert on `url`) and listed under the builder with
  Copy and Remove.
- **PostHog speed (measured 2026-10-07):** an uncached query takes about 5s, a cold page fires about
  9, PostHog queues beyond about 6, so a cold load is 5 to 10s. Capping concurrency made it worse
  (tried 1, 2, 3, 6). `runHogql` times out at 20s and the page sets `maxDuration = 30`.
- **Signups and page filters:** signups are not tied to a page, so with a page filter on, the
  Sources and Locations reports hide the signup columns (`signups: null`, `signupsHidden`).
- **UTM casing:** visits carry raw link values, signups are stored as slugs, so `mergeSources`
  slugifies both sides before matching. Keep it that way.
- **Gotcha (cost a debugging round):** do NOT put `key` on each `<Suspense>` to re-show skeletons on
  filter change. React keeps the old section on screen next to the new one, so numbers look stuck.
  Key a wrapper `<div>` around all sections instead (see `analytics/page.tsx`). Also, React keeps
  old content during a navigation, so `_shell.tsx` swaps the report area to placeholders while a
  filter is pending.
- **Env vars:** web `NEXT_PUBLIC_POSTHOG_KEY` (`phc_`, public), `POSTHOG_INGEST_HOST`
  (`us.i.posthog.com`). Admin `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` (`https://us.posthog.com`), the
  access key as `POSTHOG_PERSONAL_API_KEY` or `POSTHOG_ALLACCESS_TOKEN` (`phx_`, secret). Local admin
  sets `POSTHOG_ENVIRONMENT=development` to see local test events, never set it on Vercel. The
  project's "Cookieless server hash mode" must stay ON in PostHog or events are silently dropped.
- **Known limits:** visitor location in PostHog is empty (cookieless strips the IP before GeoIP);
  signup location comes from Vercel IP headers on `WaitlistEntry` (`country`, `region`, `city`).
  WhatsApp and outreach only show by name when the link carries a UTM.

## Tech stack (proposed, see docs/OPEN_DECISIONS.md for what's still open)

- Next.js, App Router, TypeScript (strict)
- Turborepo monorepo
- PostgreSQL + Prisma
- Redis (Upstash), OTP throttling, sessions, caching
- Tailwind CSS + a small headless component layer
- Vitest + React Testing Library (unit/integration), Playwright (e2e)
- Payments: Razorpay (live, Standard Checkout, server capture, webhook). Email OTP via Resend; SMS/WhatsApp provider
  not chosen yet (static code, refused on live prod)
- Hosting: Vercel; Vercel Postgres for data, Vercel Blob for images/uploads, confirmed
- Amazon reviews: paid third-party aggregation service (confirmed route; vendor not yet picked)
- Figma: Dev Mode MCP server connected live in Claude Code (not static exports)

## Repository layout

```
apps/
  web/      -> customer storefront (Figma-strict UI)
  admin/    -> internal CMS (plain design language, help-text-first)
packages/
  database/ -> Prisma schema + generated client, single source of truth for the DB
  core/     -> shared business logic: pricing, discount engine, inventory rules,
               order state machine. Framework-agnostic, heavily unit tested
  auth/     -> OTP issuance/verification, session handling, RBAC checks
  ui/       -> headless/shared primitives only (not themed), each app layers
               its own look on top
  emails/   -> transactional email templates
  config/   -> shared eslint/tsconfig/tailwind config
docs/       -> architecture, schema rationale, test plan, security notes, open decisions
.claude/    -> Claude Code settings, hooks, project-specific skills
```

## Commands

- `npm run dev`, run both apps locally
- `npm run build`, runs `prebuild` (tests + typecheck) first, then builds both apps
- `npm test`, unit + integration tests across all packages
- `npm run lint` / `npm run typecheck`

## Where things live

| Feature                                 | Lives in                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Product browsing, PDP, cart, checkout   | `apps/web`                                                                            |
| Coupon / discount rule engine           | `packages/core`                                                                       |
| OTP signup/login, RBAC checks           | `packages/auth`                                                                       |
| Product/category/inventory/review admin | `apps/admin`                                                                          |
| DB schema & migrations                  | `packages/database`                                                                   |
| Order status timeline / tracking        | `packages/core` (state machine) + `apps/web` (display)                                |
| Visitor analytics (events, reports)     | `apps/web/lib/analytics` + `packages/core/src/analytics` + `apps/admin/app/analytics` |

## Docs index

- `docs/ARCHITECTURE.md`, module boundaries, request flow, why the monorepo split
- `docs/DATABASE_SCHEMA.md`, entities, relationships, and the reasoning behind them
- `docs/TEST_PLAN.md`, required unit/integration/e2e cases by feature area
- `docs/SECURITY_AND_DPDP.md`, encryption, consent, data-subject rights
- `docs/OPEN_DECISIONS.md`, things still needing sign-off before Phase 1
- `docs/EMAIL_PLAN.md`: parked plan and open questions for real email (OTP, offers, delivery updates)
- `docs/COMMERCE_BUILD_PLAN.md`: the approved commerce build (Insider codes, coupons, sign-in, cart, checkout,
  account, returns, Razorpay, pre-order). Read it before any of that work; it has the progress log, coupon safety
  rules and UX/messaging standards.

## Current phase

**Latest (2026-11-09):** the commerce build (Insider codes, coupons, sign-in, cart, checkout with Razorpay and COD,
account, returns, staff tools) is pushed (3650c51, then the feedback round b64b37c) and prod is migrated. Prod is still
in WAITLIST mode, so the shop is hidden until the owner flips it to LIVE. Razorpay live keys and webhook, Resend
(`onwei.in` and `mail.onwei.in` verified) and `admin.onwei.in` are set up. Read `docs/COMMERCE_BUILD_PLAN.md`
(progress log, launch checklist, section 18) before touching any of it. Left: owner's admin setup (GST/HSN, shop rules,
marquee, refund permission, Insider tiers), Insider email send (100 a day), Phase G (real SMS and WhatsApp, phone
sign-in is refused on live prod until then), Phase H pre-order (needs answers in section 14a), and unplanned gaps
(shipped/delivered/refund emails, PIN autofill). GST invoicing, delivery partner and CRM are still not started.
Local test data: dev waitlist entry and Insider code WEI6615 for the owner's own email; test orders ONW1001 to ONW1006.
Contact Us (2026-11-09, local, not pushed): `/contact` from Figma 1189:6006 / 1189:6203, reusing SiteHeader, FaqSection
(new `expandAfter` for in-place "view all"), InstagramGrid, SiteFooter, shared `formStyles.ts` and `SocialIcons.tsx`.
Messages are saved (`ContactMessage`), emailed to the support address with the sender as reply-to, and handled in admin
Messages (`customer:view`). Contact details live on `SiteSetting` (admin Settings). Two migrations
(`20261110120000_contact_us`, `20261110120100_contact_address_lines`) need the prod migration before the push.

**Latest (2026-10-21):** Blogs page and admin blog editor, admin overhaul (speed, nav, shared kit), waitlist blog switch,
blog analytics, product delete and redesigned product pages are pushed (up to f34223b). The backup product image work
(`no-photo.svg`, `ProductImage`, `SafeImage`, seed no longer creates placeholder rows) is done locally and not pushed.
Prod still has placeholder photo rows to remove from each product's Photos tab. Details: `docs/PHASE_1_SCAFFOLD_PROGRESS.md`.

**Earlier (2026-10-13):** Homepage, Collection, PDP and About Us were audited against Figma and fixed, and
collection, product and journal pages are prebuilt and revalidated every 60s (sorting runs in the browser). Pushed, live
but gated by the waitlist. Login, journal article and 404 have no Figma frame, so they wait for an approved design.
Open items and decisions: `docs/FIGMA_AUDIT.md`. Older status below.

**Phase 1 is functionally complete and deployed**: DB schema, dummy OTP auth,
product browsing (Homepage/Collection/PDP), and a full admin CMS (catalog,
inventory, orders/returns, coupons, staff/roles, review moderation, marketing
content, compliance), the last of these well beyond Phase 1's original scope.
See `docs/PHASE_1_SCAFFOLD_PROGRESS.md` for the authoritative, continuously-
updated status log; trust it over this section if they ever disagree.
Phase 2 (cart/checkout/payments + coupon redemption) hasn't started and is
blocked on the payment-gateway decision in `docs/OPEN_DECISIONS.md`, plus a
Plan Mode session per ground rule 1. Phase 3: reviews (moderation already
shipped in Phase 1's admin build-out; the open piece is customer-submitted
reviews). Phase 4: analytics.
