# Database schema — rationale

The actual schema lives in `packages/database/prisma/schema.prisma`. This doc
explains the non-obvious choices so nobody "simplifies" them away later.

## Conventions that apply across the schema

- **Soft deletes** (`deletedAt`) on `Customer`, `Product`, and `Order` — never
  hard-delete something a refund, a tax record, or a support ticket might
  need to reference later.
- **Price snapshots on order lines.** `OrderItem` stores its own `unitPrice`,
  `discountAmount`, and `taxAmount` at the time of purchase, instead of
  joining to the live `Product`/`ProductVariant` price. Prices change; past
  orders shouldn't.
- **An audit-log entry for anything that touches money, inventory, or
  access.** `AuditLog` records who (or what system process) changed what, and
  what it was before. Every inventory adjustment, price change, coupon
  creation, and review approval writes one.
- **JSON `config` fields for anything with more than one shape.** Discount
  rules and product variant attributes both do this — see below — because
  hard-coding one config shape into columns is the first thing that breaks
  when the business asks for a new discount type or a new variant attribute.

## Entity groups

**Identity & access** — `Customer` (OTP-based, storefront) and `StaffUser`
(email+password, CMS) are separate tables on purpose: different auth flows,
different threat models, and a compromised customer session structurally
can't reach admin data. `Role` / `Permission` / `StaffUserRole` implement
RBAC for staff only. `OtpChallenge` stores a hashed code (never plaintext)
with an expiry, an attempt counter, and the requesting IP — this is the main
defense against junk signups, alongside basic format validation.

**Catalog** — `Category` is self-referencing (`parentId`) so subcategories
work without a schema change later. `Product` holds the shared fields;
`ProductVariant` holds size/color/SKU/price-override, because a sports
clothing catalog without variants would need a rework almost immediately.
`ProductImage` has an `isPlaceholder` flag so the storefront can show a
default image until an admin uploads a real one, per the brief.

**Inventory** — `Warehouse` exists even for a single-warehouse launch, so
adding a second one later is a data change, not a schema change.
`Inventory` tracks on-hand and reserved quantity per variant per warehouse;
`InventoryLog` is the audit trail for every change and its reason.

**Orders** — `Order` / `OrderItem` / `OrderStatusHistory` / `Payment` /
`ReturnRequest`. `OrderStatusHistory` is what powers order tracking: every
status change (placed, confirmed, packed, shipped, delivered, or a return
step) is a row, so the storefront can render a timeline instead of just a
current-status label.

**Discounts** — `Coupon` holds the code-level rules (usage limit, per-customer
limit, min order value, validity window). `DiscountRule` holds the _kind_ of
discount (`PERCENTAGE`, `FLAT`, `BUY_X_GET_Y`, and future types) with a typed
`config` JSON field validated by a zod schema per type — see
`.claude/skills/discount-rule-engine/`. `CouponRedemption` records every use,
for enforcing limits and for audit.

**Reviews** — `Review.source` is `SITE`, `EMAIL`, or `AMAZON_IMPORT`, and
`targetType` is `PRODUCT` or `BRAND`, per the brief. `isApproved` gates
visibility — nothing shows on the storefront until an admin approves it.
`externalRef` stores a source URL/ID for imported reviews, both for
traceability and to avoid importing the same review twice. See
`docs/OPEN_DECISIONS.md` for how Amazon reviews actually get in.
`ReviewPlacement` curates which approved reviews show on which
`ReviewSurface` (`HOME_HERO`, `HOME_WALL`, `PRODUCT_WALL`); a surface with no
curated placements falls back to the most-recent-approved reviews for that
target instead of going blank. `ReviewSurfaceConfig.limit` is the configurable
display count per surface, and is itself scoped by an optional `productId`
(only meaningful for `PRODUCT_WALL`): a row with `productId` set overrides the
count for that one product, a row with `productId: null` is that surface's
global default, and a surface+product with no row at all falls back to an
in-code default (`DEFAULT_SURFACE_LIMITS` in `packages/core`). This exists
because the PDP review wall's count needed to be settable per product without
one admin's change silently affecting every other product's page.

**Compliance** — `ConsentLog` records what policy version a customer accepted
and when (needed to demonstrably show consent under the DPDP Act — see
`docs/SECURITY_AND_DPDP.md`). `DataSubjectRequest` tracks access/erasure/
correction requests, also a DPDP requirement once a customer asks for one.

## Deliberately deferred

Multi-currency, multi-language, and multi-warehouse _routing_ (choosing which
warehouse fulfills an order) aren't in the first schema pass — `Warehouse`
and `currency` fields exist so they can be added without a breaking
migration, but the logic for them isn't built until there's an actual need.

## Migrations, versioning, and rollback

This is a real production app with a real customer/order database, so schema
changes are versioned and reversible by design, not by hoping the last deploy
was fine.

- **Prisma Migrate is the version history.** Every schema change is a
  timestamped file under `packages/database/prisma/migrations/`, committed to
  git — that directory _is_ the changelog of the database, reviewed in PRs
  like any other code change (this is also why schema changes need a Plan
  Mode round per ground rule #1 in `CLAUDE.md`).
- **`migrate dev` locally, `migrate deploy` in production.** Never
  `prisma db push` against a database anyone else depends on — it doesn't
  produce a migration file, so there's nothing to roll back to.
- **Vercel doesn't run migrations on deploy.** Per the parent workspace's
  standing deploy rule, `prisma migrate deploy` is run by hand against the
  production database after the app code that needs it has shipped, not as
  part of the Vercel build step.
- **Expand-contract for anything that isn't purely additive.** A column
  rename, type change, or drop goes through three separate migrations (add
  the new shape → backfill and dual-write → drop the old shape once nothing
  reads it) instead of one migration that changes it in place. A bad deploy
  can then be rolled back by reverting the _app code_ to read/write the old
  shape, without touching the database at all — this is the primary rollback
  mechanism, not a database restore.
- **Migrations are append-only once applied anywhere shared** (staging or
  prod). If a migration turns out wrong, write a new migration that undoes it
  — never edit or delete an already-applied migration file, for the same
  reason a pushed git commit doesn't get rewritten.
- **Point-in-time recovery is the last resort, not the plan.** Vercel
  Postgres backups/PITR cover genuine data loss or corruption, not routine
  "that migration was wrong" rollbacks — restoring loses every write since
  the restore point, including real orders. Confirm the PITR retention window
  for the actual Vercel Postgres plan in use before Phase 1 launches; it
  varies by tier and isn't decided here.
