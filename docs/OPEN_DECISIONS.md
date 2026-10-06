# Open decisions

Defaults were picked for everything below so this scaffold could be built
without stalling on every question. Anything marked **pending** genuinely
needs an answer before Phase 1 starts, because a wrong guess here means
rewriting real code, not just a config value.

## Decided by default (override anytime, low cost to change)

| Decision                     | Default                                                                                                                         | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database                     | PostgreSQL + Prisma                                                                                                             | Orders, inventory, and coupons need real relational integrity (no overselling, no double-redemption)                                                                                                                                                                                                                                                                                                                                                                                                     |
| Monorepo tool                | Turborepo                                                                                                                       | Two apps, several shared packages, need one cached build/test pipeline                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Frontend styling             | Tailwind + headless components                                                                                                  | Fast to implement the Figma spec exactly without fighting a themed component library                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Hosting                      | Vercel + Vercel Postgres (data) + Vercel Blob (images/uploads)                                                                  | Standard, low-ops, single-vendor pairing for a Next.js monorepo. Confirmed.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Admin auth                   | Email + password (room for MFA later), separate from customer OTP auth                                                          | Different threat model than the storefront, see `docs/ARCHITECTURE.md`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Amazon reviews               | Paid third-party reviews-aggregation service                                                                                    | Confirmed route; vendor not yet picked (see pending below).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Figma access                 | Figma Dev Mode MCP server, connected live in Claude Code, rather than static exported files                                     | Confirmed; lets `apps/web` be built against the live file instead of manual exports. Needs the Figma file link + MCP server set up before Phase 1 UI work starts. Until it's connected, or for any screen/component genuinely missing from the file, `apps/web` UI work stops for explicit design approval instead of improvising, see root `CLAUDE.md` ground rule 8.                                                                                                                                   |
| Collection page reviews wall | Reuses the `HOME_WALL` `ReviewSurface` (same curated content as Homepage's wall) rather than a new `COLLECTION_WALL` enum value | Figma shows the same curated reviews repeated per page; a dedicated surface would need its own schema migration for a purely cosmetic difference. Revisit if Collection ever needs independently-curated reviews from Homepage's.                                                                                                                                                                                                                                                                        |
| SEO ownership                | Custom/in-house (own sitemaps, canonicals, structured data, redirects, meta) rather than a headless-CMS/SEO-plugin route        | Confirmed. `Redirect` (hard delete, no admin UI) and `Article` (hard delete, `isPublished` flag, same convention as `ValueProp`) plus `metaTitle`/`metaDescription` overrides on `Product`/`Category` shipped for this. `AggregateRating`/`Review` structured data deliberately withheld until a real customer-submitted review flow exists (today's `Review` rows are staff/seed-entered only), shipping it earlier risks a Google rich-result spam action against non-independently-submitted content. |
| hreflang / i18n routing      | Skipped, not building `[locale]` routing or hreflang alternates                                                                 | India-only, single locale, no second locale's content to point to today; would be pure YAGNI. Revisit only if international expansion becomes a real roadmap item, it changes routing architecture, not just a metadata addition.                                                                                                                                                                                                                                                                        |

## Deferred on purpose (2026-09-30, no answers yet)

Email (real OTP delivery, offers, delivery updates): full recommendation and eight open questions in
`docs/EMAIL_PLAN.md`. Parked until the owner approves a provider and answers those.

Orders and checkout rules (COD vs online, guest checkout, stock reservation, partial shipments and
refunds, returns policy), GST and invoicing (registration, tax-inclusive pricing, HSN, e-invoicing,
in-house vs third party), delivery partner (carrier, serviceability, rates, label flow), and CRM
(vendor, what gets synced). Schema and code for these wait until the owner answers.

## Pending from the 2026-09-30 audit (owner decision needed)

- `packages/emails` is unused (OTP goes through `ConsoleOtpSender`): wire it into OTP, or delete it.
- `Fonts/` at the repo root is untracked: add to the repo, move to `apps/web/public/fonts`, or ignore.
- Vercel plan (Hobby or Pro): limits cron and function duration, matters for any future job runner.
- Dashboard counts may move to summary tables (schema change), and `InventoryLog.productVariantId` can be
  made required in a later migration.
- Confirm the Upstash env vars exist on both Vercel projects before the next deploy (limiters now fail
  closed in production).

## Pending, needs an actual answer

**Payment gateway.** Razorpay is the leading candidate (India-first) but
**not finalized**, treat as a placeholder until confirmed. This also gates
the OTP/SMS provider choice: an India-first pairing (Razorpay + e.g. MSG91)
and a global pairing (e.g. Stripe + Twilio) lead to different integration
code and different compliance/data-residency considerations in
`docs/SECURITY_AND_DPDP.md`.

**Amazon reviews vendor.** Route is decided (paid third-party aggregation
service, since Amazon's own Product Advertising API hasn't returned actual
review text since 2010 and scraping is against Amazon's ToS), still need to
pick which vendor and confirm its pricing/rate limits before building the
integration.

**Sensitive-field encryption.** Whether `Customer.phone`/`email` get
application-level encryption (not just relying on disk-level encryption at
the database) depends on the DPDP risk appetite and on how search/lookup by
phone or email needs to work operationally (support lookups, admin search).

**Vercel Postgres backup/PITR retention.** Needed as the last-resort data
recovery path alongside the expand-contract migration approach in
`docs/DATABASE_SCHEMA.md`, depends on which Vercel Postgres plan/tier is
provisioned.

**Logistics/courier integration.** The brief asks for order-tracking
"feasibility." The schema (`OrderStatusHistory`) supports it either way, but
whether status updates come from a courier webhook (Shiprocket, Delhivery,
etc.) or are entered manually by admin staff for now is a real product and
cost decision, not just a technical one.

**Newsletter campaign/content management.** The admin can view subscribers
and (as of 2026-09-24) add one manually, but there's no way to compose or
send an actual newsletter issue. No send provider, template format,
audience-segmentation, or scheduling model exists yet anywhere in the repo.
Needs its own scoping conversation (which provider, what content, how
consent/unsubscribe is enforced per `docs/SECURITY_AND_DPDP.md`) before any
of that gets built.

**Analytics region and consent.** Visitor analytics use PostHog Cloud
(cookieless, so no consent banner). Still need the client to confirm the US
or EU region is acceptable for DPDP, and whether they want a consent banner
anyway (a banner is new storefront UI that is not in Figma, so it needs
design approval first). See `docs/SECURITY_AND_DPDP.md`, "Visitor analytics".
