# Architecture

## Why a monorepo, and why this split

The storefront and the CMS have different audiences, different design
languages, and different release risk (a storefront bug is customer-facing and
urgent; a CMS bug is usually not). Splitting them into two Next.js apps keeps
that boundary real in the code, not just in convention. A Turborepo monorepo
keeps them from drifting apart on shared logic: pricing, the discount engine,
inventory rules, and the order state machine live once, in `packages/core`,
and both apps import it. Turborepo also caches and parallelizes `build`,
`test`, and `lint` across every package, so the "run tests before build" rule
in the root `CLAUDE.md` stays fast as the project grows.

```
apps/web        apps/admin
     \              /
      \            /
     packages/core        <- pricing, discounts, inventory rules, order state machine
     packages/auth        <- OTP + RBAC
     packages/database    <- Prisma schema + client (the only place that talks to Postgres)
     packages/ui          <- headless primitives (no visual theme)
     packages/emails       <- transactional email templates
```

Only `packages/database` talks to Postgres directly. Everything else — both
apps included — goes through it or through `packages/core`, so a schema
change has one place to ripple out from instead of two apps independently
querying the database.

## Request flow (storefront checkout, as an example)

1. `apps/web` collects the cart + shipping address client-side.
2. On "place order," an API route in `apps/web` calls into `packages/core`'s
   checkout function with the cart, the customer's verified phone/email, and
   any coupon code.
3. `packages/core` re-prices everything server-side (never trusts a client-sent
   total), applies the discount engine, checks inventory, and returns a
   priced order or a list of problems (out of stock, coupon expired, etc.).
4. If priced successfully, the route creates the `Order` + `OrderItem` rows
   (via `packages/database`), decrements reserved inventory, and hands off to
   the payment provider.
5. A payment webhook (also in `apps/web`'s API routes) confirms payment and
   flips the order to `CONFIRMED`, writing an `OrderStatusHistory` row — this
   is what powers order tracking.

## Integrations are abstracted behind an interface

Payment gateway, SMS/email OTP delivery, and product search are all things
this project doesn't have a final vendor for yet (see `OPEN_DECISIONS.md`),
and even once chosen, vendors get switched. Each integration point is a small
interface in `packages/core` (e.g. `PaymentProvider`, `OtpSender`,
`ProductSearchIndex`) with one adapter implementation per vendor. Business
logic calls the interface, never the vendor SDK directly. Swapping Razorpay
for Stripe, or MSG91 for Twilio, means writing one new adapter file — it
doesn't touch checkout, signup, or anything else that depends on the
interface.

## RBAC and the two kinds of "user"

Customers and CMS staff are modeled as separate tables (`Customer`,
`StaffUser`) rather than one `User` table with a role flag. They have
different auth flows (OTP-only for customers; email + password, with room for
MFA later, for staff) and different threat models — a leaked customer session
should never be able to touch the admin surface, and keeping them structurally
separate makes that a property of the schema, not just of the code. RBAC
(`Role`, `Permission`, `StaffUserRole`) only applies to `StaffUser`. The
super-admin is bootstrapped from the `SUPERADMIN_EMAIL` environment variable
on first run — that account gets every permission automatically, and after
that, role management happens inside the CMS like any other admin.

## Analytics — read path stays off the OLTP hot path

Order-value, drop-off, and return-rate metrics (an admin requirement) are
cheap at low volume but get expensive as order volume grows if they're
computed with live aggregation queries against the same Postgres instance
that's serving checkout traffic. The plan is a small set of summary tables
(e.g. `daily_sales_summary`) refreshed on a schedule, which the admin
dashboard reads from instead of aggregating `Order`/`OrderItem` directly.
Funnel events (`product_viewed`, `added_to_cart`, `checkout_started`) are
logged to an `AnalyticsEvent` table for now; if this needs richer analysis
later, swapping in a dedicated tool (PostHog, etc.) means changing where
events are sent, not how the rest of the app is built.
