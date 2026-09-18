---
name: cms-plain-language
description: Use when writing or reviewing any user-facing text in apps/admin (labels, help text, empty states, error/validation messages, confirmation dialogs, tooltips). Enforces the plain-language rule from the root CLAUDE.md so CMS copy never leaks implementation detail at internal ops staff.
---

# CMS plain language

`apps/admin` has no design system to hide behind (unlike `apps/web`, which follows
Figma exactly) — the copy itself is the interface, so it has to read like a
colleague explaining what a button does, not a database field name or an error
code.

## Rules

- **Name the thing the way ops staff would say it out loud**, not the way it's
  named in `schema.prisma`. `discountAmount` -> "Discount", `isApproved` ->
  "Visible on site", `ConsentLog` never appears in copy at all.
- **Every error message says what to do next**, not just what went wrong.
  "This coupon code is already in use — pick a different code" beats
  "Coupon.code must be unique."
- **Empty states explain how to fill them**, not just that they're empty.
  "No products yet — add your first one" beats "No data."
- **No stack traces, status codes, or enum values in anything a human reads.**
  Map `DiscountRule.type: 'BUY_X_GET_Y'` to "Buy X, get Y" before it reaches a
  label; map raw exceptions to a one-line human explanation before they reach
  a toast.
- **Confirmation dialogs before anything irreversible** (deleting a product,
  refunding an order, changing a customer's phone number) state the actual
  consequence in plain terms, not "Are you sure?"
- **Abbreviate nothing** an ops person wouldn't already use daily. SKU and
  RTO are fine; internal shorthand for a feature or table name is not.

## When reviewing existing copy

If a string reads like it was copy-pasted from a variable name, a Prisma
model, or an HTTP status, rewrite it before it ships — this applies to seed
data and fixtures too, not just live copy.
