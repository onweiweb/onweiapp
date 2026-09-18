---
name: discount-rule-engine
description: Use when adding or changing anything in packages/core's discount/coupon logic, or the DiscountRule/Coupon/CouponRedemption models — new discount types, redemption limits, coupon validation, or price calculation order. Encodes conventions from docs/DATABASE_SCHEMA.md's Discounts section that aren't obvious from the schema alone.
---

# Discount rule engine conventions

`Coupon` (code-level rules: usage limit, per-customer limit, min order value,
validity window) is deliberately separate from `DiscountRule` (the *kind* of
discount: `PERCENTAGE`, `FLAT`, `BUY_X_GET_Y`, and future types). Don't
collapse these back into one table or one config shape — that's the first
thing that breaks when the business asks for a new discount type.

## Rules

- **`DiscountRule.config` is a typed JSON field, validated by a zod schema
  per `type`.** Adding a new discount type means adding a new zod schema and
  a new branch in the calculation function, not adding new nullable columns
  to `DiscountRule`.
- **Pricing is always re-computed server-side at checkout**, never trusted
  from the client, per `docs/ARCHITECTURE.md`'s request flow. Never add a
  code path that accepts a client-supplied discounted total.
- **`CouponRedemption` is written for every use**, even failed/rejected
  attempts if they got past validation, so usage-limit and per-customer-limit
  enforcement has a real audit trail — don't compute "how many times used"
  by aggregating `Order` instead.
- **Order lines snapshot the discount amount actually applied**
  (`OrderItem.discountAmount`) at purchase time. Never derive a past order's
  discount by re-running current `DiscountRule.config` against it — rules and
  coupons change after orders are placed.
- **An `AuditLog` entry on every coupon/discount-rule creation or edit** per
  the schema-wide convention in `docs/DATABASE_SCHEMA.md` — this is money-
  adjacent logic, not optional here.
- **This logic lives once, in `packages/core`.** Neither `apps/web` nor
  `apps/admin` re-implements discount math locally, per root `CLAUDE.md`
  ground rule 3.

## Before adding a new discount type

Check `docs/OPEN_DECISIONS.md` first — a new discount shape used to be an
"invent scope" case if it wasn't already implied by the brief. Flag it as a
new decision if it isn't already covered.
