# Test plan

This is the baseline test coverage expected before a feature area is
considered done. Unit tests live next to the code in `packages/*`;
integration tests live next to the API routes in each app; e2e specs live in
a top-level `e2e/` folder (Playwright). New test cases get added here as
features are built, not just written into the test files silently.

## Auth & OTP (`packages/auth`)

- Requesting an OTP for a new email/phone creates a challenge with the
  correct expiry and a hashed (never plaintext) code.
- Submitting the correct code within the expiry consumes the challenge and
  creates/authenticates the customer.
- Submitting an incorrect code increments `attempts` and fails; exceeding
  `maxAttempts` invalidates the challenge.
- Submitting an expired code fails, even if it was otherwise correct.
- Requesting more than N OTPs for the same identifier within a short window
  is rate-limited (junk-data / abuse prevention).
- A disposable/blocklisted email domain is rejected at signup before an OTP
  is even sent.
- A malformed phone number (wrong length, wrong format) is rejected client-
  and server-side.
- Two customers can't register with the same verified phone number.

## Catalog & browsing (`apps/web`)

- Category page returns only `ACTIVE` products in that category, excluding
  soft-deleted ones.
- Product detail page shows all variants with correct price, and falls back
  to the placeholder image when no admin-uploaded image exists.
- A product with `DRAFT` status is not visible on the storefront.
- Out-of-stock variants are shown but not purchasable.

## Cart & checkout (`packages/core` + `apps/web`)

- Adding a variant to the cart twice increases quantity rather than creating
  a duplicate line.
- Checkout total is always recomputed server-side from live cart + rules,
  a client-supplied total or discount amount is never trusted.
- Checkout fails clearly (not silently) when a variant goes out of stock
  between "add to cart" and "place order."
- A successful order creates the correct `OrderItem` price snapshot even if
  the product's live price changes immediately after.
- Placing an order writes an initial `OrderStatusHistory` row and decrements
  reserved inventory.

## Discount engine (`packages/core/discounts`), see the skill for the pattern

- A percentage discount applies correctly to a qualifying cart and not to a
  non-qualifying one (e.g. below `minOrderValue`).
- A buy-2-get-1 rule correctly discounts exactly one qualifying unit, not
  more, for a cart with exactly 2, exactly 3, and exactly 5 qualifying items.
- An expired or not-yet-started coupon is rejected.
- A coupon at its `usageLimit` or a customer at their `perCustomerLimit` is
  rejected, even if the code itself is otherwise valid.
- Two non-stackable rules on the same cart: only the higher-priority one
  applies.
- Two stackable rules on the same cart: both apply, and the combined
  discount is calculated correctly (not just summed naively if they interact,
  e.g. percentage-of-already-discounted-total vs. percentage-of-original).

## Inventory (`packages/core` + `apps/admin`)

- An admin stock adjustment writes an `InventoryLog` row with the correct
  reason and actor.
- Concurrent orders for the last unit of a variant: exactly one succeeds,
  the other fails with a clear out-of-stock error (no overselling).
- A return that's approved increments stock and logs the reason as `RETURN`.

## Reviews (`apps/web` + `apps/admin`)

- A submitted review defaults to `isApproved: false` and is not shown on the
  storefront until approved.
- Approving a review sets `approvedAt`/`approvedBy` and writes an `AuditLog`
  entry.
- An imported review with an `externalRef` that already exists is not
  duplicated on a second import.
- A brand-level review (`targetType: BRAND`) shows on the brand reviews
  section and not on an unrelated product page.

## RBAC (`packages/auth` + `apps/admin`)

- A staff user without a given permission gets a 403 from the corresponding
  API route, not just a hidden UI element (the check must be server-side).
- The bootstrapped super-admin (from `SUPERADMIN_EMAIL`) has every
  permission on first run without an explicit role assignment.
- Removing a role's permission takes effect immediately for users with that
  role (no stale cached permission set).

## Admin hardening (added 2026-09-30)

- Staff login rate limit allows attempts when Upstash is not configured (unit test); limiter behavior
  under load is covered by Upstash itself.
- Pagination helper: invalid `?page=` falls back to 1, window fetches one look-ahead row, trim reports
  whether a next page exists (`apps/admin/app/_lib/pagination.test.ts`).
- `updateOrderStatus`: two concurrent legal transitions from the same status apply exactly one and
  write exactly one history row (integration, needs `DATABASE_URL`).

## Admin analytics (`apps/admin`)

- Average order value, drop-off rate, and return rate are computed correctly
  against a known fixture dataset (exact expected numbers, not just "does it
  run").
- The dashboard reads from the summary table, not from a live aggregate
  query against `Order`/`OrderItem` (guard this with a query-plan or query-
  count assertion, not just a snapshot of the output).

## Visitor analytics (`apps/web` + `packages/core` + `apps/admin`)

- `sanitizeAttribution`, `buildUtmLink` and `describeSource` are unit tested (slugs, unknown
  channel, empty campaign, own-host referrer counts as direct).
- `runHogql` sends values as parameters and collapses the query to one line; each report
  (traffic, sources with campaign, engagement, forms funnel) is unit tested with mocked responses,
  including the not-configured and failed-request cases.
- `useFormTracking` never sends a field value, sends `form_abandoned` once with the last field, and
  nothing after a successful submit.
- `POST /api/waitlist` stores cleaned UTM, referrer and geo headers, and still signs up when
  attribution is junk or missing (DB integration test, needs `DATABASE_URL`).
- Audit follow-up tests: query timeout maps to `REQUEST_FAILED`; mixed-case UTMs merge with stored
  slugs; page filter hides signups in sources and locations (and skips the DB); day buckets use
  Asia/Kolkata; `refreshAnalytics` checks `waitlist:view`, is rate limited and only clears the cache
  when allowed; `buildLinkAction` happy path and empty-campaign error; `listKnownCampaigns`;
  first touch is saved when a tagged link is followed after a direct landing.
- Admin filters: clicking another filter navigates, the current one does nothing, new-tab clicks are
  left alone. Manual check after any change to `analytics/page.tsx`: switch filters and confirm the
  old numbers are replaced, not shown next to the new ones.

## End-to-end (Playwright, run in CI, not on every commit)

- New customer: sign up with OTP → browse a category → view a product →
  add to cart → checkout with a valid coupon → see the order confirmation.
- Returning customer: log in with OTP → view past orders → see the tracking
  timeline for one → request a return.
- Admin: log in → create a category and a product with variants → set a
  discount code with a BOGO rule → approve a pending review → see it appear
  in the metrics dashboard.
