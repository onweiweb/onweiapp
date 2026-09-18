# Open decisions

Defaults were picked for everything below so this scaffold could be built
without stalling on every question. Anything marked **pending** genuinely
needs an answer before Phase 1 starts, because a wrong guess here means
rewriting real code, not just a config value.

## Decided by default (override anytime, low cost to change)

| Decision | Default | Why |
|---|---|---|
| Database | PostgreSQL + Prisma | Orders, inventory, and coupons need real relational integrity (no overselling, no double-redemption) |
| Monorepo tool | Turborepo | Two apps, several shared packages, need one cached build/test pipeline |
| Frontend styling | Tailwind + headless components | Fast to implement the Figma spec exactly without fighting a themed component library |
| Hosting | Vercel + Vercel Postgres (data) + Vercel Blob (images/uploads) | Standard, low-ops, single-vendor pairing for a Next.js monorepo. Confirmed. |
| Admin auth | Email + password (room for MFA later), separate from customer OTP auth | Different threat model than the storefront — see `docs/ARCHITECTURE.md` |
| Amazon reviews | Paid third-party reviews-aggregation service | Confirmed route; vendor not yet picked (see pending below). |
| Figma access | Figma Dev Mode MCP server, connected live in Claude Code, rather than static exported files | Confirmed; lets `apps/web` be built against the live file instead of manual exports. Needs the Figma file link + MCP server set up before Phase 1 UI work starts. Until it's connected, or for any screen/component genuinely missing from the file, `apps/web` UI work stops for explicit design approval instead of improvising — see root `CLAUDE.md` ground rule 8. |

## Pending — needs an actual answer

**Payment gateway.** Razorpay is the leading candidate (India-first) but
**not finalized** — treat as a placeholder until confirmed. This also gates
the OTP/SMS provider choice: an India-first pairing (Razorpay + e.g. MSG91)
and a global pairing (e.g. Stripe + Twilio) lead to different integration
code and different compliance/data-residency considerations in
`docs/SECURITY_AND_DPDP.md`.

**Amazon reviews vendor.** Route is decided (paid third-party aggregation
service, since Amazon's own Product Advertising API hasn't returned actual
review text since 2010 and scraping is against Amazon's ToS) — still need to
pick which vendor and confirm its pricing/rate limits before building the
integration.

**Sensitive-field encryption.** Whether `Customer.phone`/`email` get
application-level encryption (not just relying on disk-level encryption at
the database) depends on the DPDP risk appetite and on how search/lookup by
phone or email needs to work operationally (support lookups, admin search).

**Vercel Postgres backup/PITR retention.** Needed as the last-resort data
recovery path alongside the expand-contract migration approach in
`docs/DATABASE_SCHEMA.md` — depends on which Vercel Postgres plan/tier is
provisioned.

**Logistics/courier integration.** The brief asks for order-tracking
"feasibility." The schema (`OrderStatusHistory`) supports it either way, but
whether status updates come from a courier webhook (Shiprocket, Delhivery,
etc.) or are entered manually by admin staff for now is a real product and
cost decision, not just a technical one.
