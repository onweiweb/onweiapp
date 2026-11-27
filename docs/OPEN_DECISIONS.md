# Open decisions and open items

The one list of what is still open across Onwei: owner set-up, things waiting on outside services, decisions that need
an answer or a plan, design gaps and known loose ends. Audited 2026-11-26. When something closes, move it to "Decided"
(with the date) or delete it; don't leave stale entries. Build details live in `docs/COMMERCE_BUILD_PLAN.md`.

## Decided by default (override anytime, low cost to change)

| Decision                     | Default                                                                                                                         | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database                     | PostgreSQL + Prisma                                                                                                             | Orders, inventory, and coupons need real relational integrity (no overselling, no double-redemption)                                                                                                                                                                                                                                                                                                                                                                                                     |
| Monorepo tool                | Turborepo                                                                                                                       | Two apps, several shared packages, need one cached build/test pipeline                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Frontend styling             | Tailwind + headless components                                                                                                  | Fast to implement the Figma spec exactly without fighting a themed component library                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Hosting                      | Vercel Pro + Neon Postgres (via Vercel) + Vercel Blob (images/uploads)                                                          | Standard, low-ops pairing for a Next.js monorepo. Confirmed; Pro plan confirmed 2026-11.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Admin auth                   | Email + password (room for MFA later), separate from customer OTP auth                                                          | Different threat model than the storefront, see `docs/ARCHITECTURE.md`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Amazon reviews               | Paid third-party reviews-aggregation service                                                                                    | Confirmed route; vendor not yet picked (see pending below).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Figma access                 | Figma Dev Mode MCP server, connected live in Claude Code, rather than static exported files                                     | Confirmed; lets `apps/web` be built against the live file instead of manual exports. Needs the Figma file link + MCP server set up before Phase 1 UI work starts. Until it's connected, or for any screen/component genuinely missing from the file, `apps/web` UI work stops for explicit design approval instead of improvising, see root `CLAUDE.md` ground rule 8.                                                                                                                                   |
| Collection page reviews wall | Reuses the `HOME_WALL` `ReviewSurface` (same curated content as Homepage's wall) rather than a new `COLLECTION_WALL` enum value | Figma shows the same curated reviews repeated per page; a dedicated surface would need its own schema migration for a purely cosmetic difference. Revisit if Collection ever needs independently-curated reviews from Homepage's.                                                                                                                                                                                                                                                                        |
| SEO ownership                | Custom/in-house (own sitemaps, canonicals, structured data, redirects, meta) rather than a headless-CMS/SEO-plugin route        | Confirmed. `Redirect` (hard delete, no admin UI) and `Article` (hard delete, `isPublished` flag, same convention as `ValueProp`) plus `metaTitle`/`metaDescription` overrides on `Product`/`Category` shipped for this. `AggregateRating`/`Review` structured data deliberately withheld until a real customer-submitted review flow exists (today's `Review` rows are staff/seed-entered only), shipping it earlier risks a Google rich-result spam action against non-independently-submitted content. |
| hreflang / i18n routing      | Skipped, not building `[locale]` routing or hreflang alternates                                                                 | India-only, single locale, no second locale's content to point to today; would be pure YAGNI. Revisit only if international expansion becomes a real roadmap item, it changes routing architecture, not just a metadata addition.                                                                                                                                                                                                                                                                        |

## Decided (kept for history)

| Topic                   | Decision                                                                                               | When       |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| Payment gateway         | Razorpay, live keys and webhook on prod                                                                | 2026-11-09 |
| Email                   | Resend, `onwei.in` and `mail.onwei.in` verified. `packages/emails` sends every email                   | 2026-11-09 |
| SMS sign-in codes       | MSG91 (DLT), env vars set on the web project, real codes on prod (checked 2026-11-26)                  | 2026-11-17 |
| WhatsApp                | Gupshup. Sign-in template `onweisignincode` is Authentication and approved; templates managed in admin | 2026-11-16 |
| Delivery partner        | iThink Logistics: cards and orders live, webhook pushed (section 19 of the build plan)                 | 2026-11-24 |
| Courier status updates  | iThink webhook with Bearer token, re-checked with Track Order; buttons stay as backup                  | 2026-11-26 |
| Vercel plan             | Pro                                                                                                    | 2026-11    |
| Pre-orders              | Through the bag with a reserve (build plan section 14a)                                                | 2026-11-26 |
| Insiders access         | Invite-only switch built (admin join mode); prod still open signup until the owner flips it            | 2026-11-26 |
| Refund email            | One email per staff refund (return, cancelled order or pre-order, order page refund)                   | 2026-11-28 |
| Failed deliveries (NDR) | Order flagged with the courier's reason; staff choose Try again or Send it back                        | 2026-11-28 |
| Return pickups          | Staff Book pickup on an approved return (iThink reverse parcel), webhook follows it                    | 2026-11-28 |
| COD money               | Admin COD money page reads iThink payouts, marks orders paid out, flags wrong amounts                  | 2026-11-28 |
| Newsletter              | Written and sent from admin in daily batches, opt-in only by default, one-click unsubscribe            | 2026-11-28 |
| PIN autofill            | Empty city and state filled from iThink's PIN data in every address form                               | 2026-11-28 |

## Owner set-up in admin (no code needed)

- **Launch:** flip prod from WAITLIST to LIVE (admin Settings, site mode). Check Homepage, a collection page and a
  product page right after: those pages are prebuilt.
- **Pre-orders:** create the campaign and gift-only products, enter stock in Inventory (reserves hold stock), submit the
  three pre-order WhatsApp templates (Utility), set site mode to PREORDERS when ready.
- **Insiders:** invite reward rules, flip the join mode to invite-only, Insider tiers (none set), send the Insider email
  (Resend free plan: 100 a day).
- **Shop:** GST rate and HSN per product; shop rules (free delivery threshold, delivery fee, COD fee and limits, return
  window); marquee text (still says ₹1500); give a role the refund permission.
- **Delivery:** empty shipper box weights per category; confirm the Yoga box (37 x 17 x 14 in is about 29 kg by volume).
- **Content:** remove the placeholder photo rows on prod products (then delete the old `placeholder-*.png` files from
  the repo); feedback content (video links, movers number).
- **WhatsApp:** in admin WhatsApp, check every message that is On points at an approved template. Rejected for
  "Incorrect Category" (as of 2026-11-26): `onwei_insider_code`, `onwei_insidersv2`, `insider_nudge_2`,
  `insider_nudge_4`, `insider_message_5`, `insider_message_113`.

## Built 2026-11-28, waiting to go live

- **Prod migrations, before the push** (owner, `DIRECT_URL="<prod>" npx prisma migrate deploy` from `packages/database`):
  `20261128120000_ndr_failed_delivery`, `20261128130000_return_pickups`, `20261128140000_cod_remittances`,
  `20261128150000_newsletter_issues`. All additive.
- **Vercel (admin):** optional `NEWSLETTER_EMAIL_FROM` (e.g. `Onwei <news@mail.onwei.in>`, falls back to `EMAIL_FROM`).
  `INSIDER_LINK_SECRET` must be set on admin and web: it signs newsletter unsubscribe links too.
- **First real checks on prod:** book one return pickup (iThink's docs disagree on which couriers do reverse pickups),
  press "Update from iThink" on COD money, send the first newsletter as a test to staff, upload one large product photo.
- **iThink webhook:** no pushes seen in a 30-minute watch of the live logs (2026-11-27). Check the runtime logs after
  the next real pickup or delivery.

## Waiting on outside services

- **iThink:** reply sent or to send: yes to enabling live Order Details, and connect the webhook (URL
  `https://www.onwei.in/api/webhooks/ithink`, Bearer Token = `ITHINK_WEBHOOK_TOKEN`). Then watch the next pickup update
  by itself and check the Vercel runtime logs.
- **MSG91 / Gupshup:** confirm the first live SMS code and WhatsApp sign-in code on prod (admin Text messages and
  WhatsApp logs). Confirm the Gupshup parameter order for Copy code and URL buttons on the first live Insider send.

## Needs a decision or a plan (don't build without one)

- **GST invoicing:** not started on purpose. No schema until there is an approved plan.
- **CRM:** not started on purpose. HubSpot and DevRev startup perks are on the table.
- **iThink extras:** showing the expected delivery date (`edd_date`), a scheduled COD money import.
- **Amazon reviews vendor:** route decided (paid aggregation service, Amazon's API has no review text), vendor and
  pricing not picked.
- **Newsletter extras:** segments, scheduling, open and click tracking, bounce and complaint webhooks.
- **Smaller:** a separate sender for order emails (`orders@mail.onwei.in`), the pre-order marquee,
  relabelling the "Total" line on the reserve checkout.
- **Privacy and data:** application-level encryption of `Customer.phone` / `email`; Neon backup and point-in-time
  restore retention; client sign-off on PostHog's US region and whether to show a consent banner (a banner is new
  storefront UI, needs design approval).
- **Analytics cost at scale:** send PostHog events straight to PostHog instead of through `/ingest` if the Vercel bill
  grows (every event is a Vercel request today).

## Storefront design gaps (need an approved layout first, ground rule 8)

- **Login, journal article and 404** have no Figma frame.
- **Mobile Homepage** hides the "Designed to Move." heading, "at your pace" note and marquee because the mobile frame
  has none of them. Confirm that is intended.
- **PDP review photos** (two per review in Figma) need a review image model, which is a schema change and a plan.
- **PDP value cards** use different copy in Figma than the Homepage cards, but both read one `ValueProp` table.
- **PDP marquee** shows review quotes (Figma 759:3116), so the admin's old "PDP" marquee surface shows nowhere. Remove
  it from the admin or give it a new home.
- **Mobile marquee between About and Reviews** (761:5063) has its own items in Figma, today it reuses the Showcase items.
- **Footer consent checkbox** is not in Figma, needs design sign-off (it is required by the consent rule).
- Not yet audited against Figma: mobile PDP below the info panel, tablet widths by eye. See `docs/FIGMA_AUDIT.md`.

## Tech loose ends

- Tests: the two failing tests are fixed, DB tests default to a 60s timeout and DB test files run one at a time
  in every package (2026-11-28). Run the full DB suite once to confirm nothing else is flaky.
- Dashboard counts may move to summary tables (schema change); `InventoryLog.productVariantId` can be made required in a
  later migration.
