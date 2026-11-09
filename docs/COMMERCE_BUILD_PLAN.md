# Commerce build plan: Insiders, coupons, sign-in, cart, checkout, account, returns, Razorpay

Status: **draft for approval, nothing built yet.** Written 2026-11-09, revised the same day with the owner's answers.
Every phase below still needs its own Plan Mode approval before code is written (root `CLAUDE.md`, ground rule 1).

This is the most critical build on the project. It moves real money, hands out discounts, and stores customer
addresses. Read the whole file before starting any phase, and update it whenever a decision is made or a phase ships.
Sections 5 (coupon safety) and 11 (UX and messaging standards) are rules, not suggestions.

Source material: client emailer PDFs "Insider emailer desktop (640px)" and "Insider emailer mobile (375px)", shared in
chat 2026-11-09. Store copies under `docs/assets/insider-email/` when Phase A starts.

---

## 1. Goal in one paragraph

Everyone on the waitlist (about 200 people) becomes an **Onwei Insider** with a personal, lifetime discount code. They
get an email from Sakshi with the code and a link to share their address, so a physical Insider card can be posted to
them. Then the store opens: visitors sign in or browse as a guest, build a cart, verify themselves by email, SMS or
WhatsApp at checkout, apply coupons and their Insider discount, and pay with Razorpay or cash on delivery. Signed-in
customers get an account page with profile, addresses, orders and returns. Staff run all of it from the admin.

## 2. Decisions so far

| Topic                              | Decision                                                                                                           | Date       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| Insider default discount           | **5%**                                                                                                             | 2026-11-09 |
| Insider tiers                      | Optional, by signup date range, set in admin                                                                       | 2026-11-09 |
| Max discount cap and "can combine" | Set **on each coupon** when it is created, not as one global setting                                               | 2026-11-09 |
| Prices                             | **Inclusive of GST**                                                                                               | 2026-11-09 |
| Shipping fee                       | Follow standard Indian e-commerce practice (section 8), values editable in admin                                   | 2026-11-09 |
| Cash on delivery                   | On/off switch in admin Settings                                                                                    | 2026-11-09 |
| Returns                            | Customers can request returns, admin defines the rules (section 9)                                                 | 2026-11-09 |
| SMS and WhatsApp codes             | Static codes for now, real providers last (see the launch blocker in section 7)                                    | 2026-11-09 |
| Insider email sender               | `sakshi.agarwal@onwei.in`, owner verifies `onwei.in` in Resend (section 12, option 2)                              | 2026-11-09 |
| Legal text                         | Privacy "post you something" line and Terms "Insider codes" clause added to defaults; prod copy is edited in admin | 2026-11-09 |
| Figma                              | Checkout, cart and pre-order file shared and inventoried (section 14)                                              | 2026-11-09 |
| Missing screens                    | Approved: design them in the existing Figma style (fonts, colours, cards, buttons of the checkout frames)          | 2026-11-09 |
| Free shipping threshold            | One value set in admin Settings, replaces the three numbers in Figma                                               | 2026-11-09 |
| Cart milestones                    | Not real. Progress bar shows free-shipping progress only; no free gift or extra 10%                                | 2026-11-09 |
| Pre-order campaign                 | Later. Kept in the plan as Phase H (section 14a)                                                                   | 2026-11-09 |
| Razorpay                           | Account created by the owner, keys to be added (section 10)                                                        | 2026-11-09 |
| Waitlist about 200 people          | Small enough to send in one go on a paid Resend plan                                                               | 2026-11-09 |
| Razorpay                           | Last phase                                                                                                         | 2026-11-09 |

## 2a. Progress log

### 2026-11-09: Phase A built locally (not pushed), Razorpay adapter built

Owner decisions this session: code locked to its owner (yes), tiers available (none set yet), default 5%, starting
values "pick your own, change later". Razorpay test keys added to `apps/web/.env.local` and `apps/admin/.env.local`.

Built:

- Schema: migration `20261109120000_add_insider_codes` (WaitlistEntry code and email-send columns, `InsiderSetting`,
  `InsiderTier`, `InsiderCardAddress`). Applied to the dev DB only.
- Core `packages/core/src/insiders/`: code generation and assignment (`WEI` + 4 digits, race-safe), tiers in India
  time with overlap checks, signed private links (`INSIDER_LINK_SECRET`), card address save and list, race-safe email
  claiming, unsubscribe. New signups get a code at once.
- Core `packages/core/src/payments/razorpay.ts`: order creation (paise only, min 100), payment and webhook signature
  checks in constant time, `RazorpayProvider`. No routes or button yet: those belong to checkout (Phase E), because
  the amount must come from an order the server priced, never from the browser.
- Email `renderInsiderCodeEmail` from the PDFs, with List-Unsubscribe one-click headers.
- Web: `/insider/address` (form, saved and posted states), `/insider/unsubscribe` (confirm button, so link scanners
  can't unsubscribe anyone), API routes with rate limits, message catalog `apps/web/lib/messages/insider.ts`.
- Admin: `/insiders` (Overview, Discount with tiers, Card addresses with CSV and "Mark posted", Email with test send and
  batched send). Uses the existing `waitlist:view` and `waitlist:manage` permissions, so no new permission rows.
- Tests: unit (codes, tiers, links, Razorpay, email), DB integration (codes, claims, unsubscribe, addresses, tiers),
  route tests (web address and unsubscribe, admin tiers).

Changed from the plan:

- The welcome email copy is unchanged (client-approved). New signups get their code by the Insider email when staff
  next press send; the Email tab shows how many are waiting.
- `EmailMessage` log table deferred to the email work in `docs/EMAIL_PLAN.md`; the send state lives on the waitlist row.
- PIN code to city and state autofill deferred (needs an outside PIN lookup service).

Before the bulk send (blockers):

1. **Artwork:** `apps/web/public/images/email/insider-card.png` (the envelope with the purple Insider card from the
   PDF) does not exist yet. Ask the client for it, about 920px wide, tightly cropped.
2. **Sender:** verify `onwei.in` in Resend, then set on the admin Vercel project: `RESEND_API_KEY`,
   `INSIDER_EMAIL_FROM="Sakshi from Onwei <sakshi.agarwal@onwei.in>"`, `INSIDER_EMAIL_REPLY_TO`, `WEB_APP_URL`.
   Rotate the Resend key first (it was exposed in a session on 2026-11-09).
3. **Both Vercel projects:** `INSIDER_LINK_SECRET` (same value in web and admin).
4. **Prod migration** by the owner: `DIRECT_URL="<prod>" npx prisma migrate deploy` from `packages/database`, before
   or with the push.
5. **Legal text** pasted into admin Legal pages on prod (section 4).
6. After deploy: Insiders, Overview, "Create missing codes"; then a test send to yourself; then send.

### 2026-11-09 (later): Phases B to F built locally (not pushed)

Owner asked to build every phase now, designs for missing screens in the existing style, legal text applied directly,
Resend and prod migration after all phases. Pre-order (Phase H) stays parked. SMS and WhatsApp use the static code.

Built:

- Insider codes in the admin waitlist table, search and CSV. Insider card artwork drawn in-house
  (`apps/web/public/images/email/insider-card.png`) from the PDF layout.
- Migrations (dev only): `20261109130000_legal_insider_text` (data: privacy line, Terms "Insider codes"),
  `20261109140000_commerce_core`, `20261109150000_cart_codes`, `20261109160000_refund_permission` (data: `order:refund`).
- Pricing engine `packages/core/src/pricing/engine.ts` (pure, paise, every rule in section 5; best saving wins when codes
  can't combine; never drops a discount just to stay above the free-delivery line). 26 unit tests.
- Commerce services `packages/core/src/commerce/`: store settings (cached 15s), identity and Insider match by verified
  email or phone, coupon eligibility (neutral NOT_VALID, limits by identity), guest and customer carts with merge,
  orders (stock and coupon holds in one transaction, idempotent payment confirmation, server capture when Razorpay only
  authorizes, auto-refund for late or double payments, expiry release), account, returns, staff order actions, coupon
  builder with lock-after-use and preview. Integration tests: COD, online, repeat confirmation, expired hold and late
  payment refund, last-item race, coupon limit, returns with refund share and single restock.
- Storefront: cart drawer (Figma 1217:3338 / 3486), bag button with count, PDP and card add to cart, entry pop-up,
  sign-in panel (email real code; SMS and WhatsApp static), `/checkout` (details, payment, Razorpay), Figma result pages
  (`/checkout/success|failed|abandoned`), `/account` (orders, profile, addresses, Insider card), order tracking with
  return requests, `/login`. Message catalog `apps/web/lib/messages/commerce.ts`. Order confirmation and staff alert
  emails.
- Admin: Settings tab "Delivery, payment and returns", coupon builder (new and edit, preview, duplicate, on/off, usage),
  order page (ship with tracking, COD collected, cancel with restock and refund, goodwill refund, needs-attention),
  Returns page (approve, reject with reason, picked up, received with or without restock, refund, exchange), product
  "Returns and tax" tab (returnable, HSN, GST rate), category returnable switch.
- Verified on localhost in the browser: add to bag, drawer, pop-up, phone sign-in, address, Razorpay test payment
  (captured by the server, order confirmed), success page, admin order and ship, coupon builder preview, return form.

Found while testing:

- Razorpay test account has auto-capture off. The server now captures authorized payments itself after checking the
  amount, so either setting works. Recommend switching auto-capture on anyway.
- From India each query to the US dev database takes about 245 ms, so checkout feels slow locally. On Vercel the
  functions sit next to the database; check the deployed speed before launch.
- The homepage marquee still says "Free shipping on orders over ₹1500". It's CMS text (admin, Homepage sections),
  not the new setting; update it to match.

Pre-existing test failures (not from this work): `apps/web/app/about/page.test.tsx` fails when the dev DB is LIVE (async
footer), `apps/admin/app/page.test.tsx` calls cookies outside a request.

Before launch (all after the phases, as agreed):

1. Prod migrations (owner, `DIRECT_URL`): the five migrations from 2026-11-09.
2. Vercel env, web: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `INSIDER_LINK_SECRET`,
   `CRON_SECRET`, `ORDER_ALERT_EMAIL` (optional), `ADMIN_APP_URL`, `OTP_STATIC_CODE` (until providers). Admin:
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `INSIDER_LINK_SECRET`, `RESEND_API_KEY`, `INSIDER_EMAIL_FROM`,
   `INSIDER_EMAIL_REPLY_TO`, `WEB_APP_URL`.
3. Razorpay webhook: `https://<web domain>/api/payments/razorpay/webhook`, events payment.authorized, payment.captured,
   payment.failed, order.paid, refund.processed, refund.failed.
4. Resend: verify `onwei.in`, rotate the exposed key, set the sender. Owner chose the free plan: the Insider email
   goes out 100 one day and the rest the next (admin Email tab has a "How many to send now" box, default 100).
   Done 2026-11-09: `onwei.in` and `mail.onwei.in` both verified in Resend, new key in place. Still to set on the admin
   Vercel project: `INSIDER_EMAIL_FROM="Sakshi from Onwei <sakshi.agarwal@onwei.in>"`.
   Admin domain: `admin.onwei.in` is live on the admin Vercel project (CNAME to Vercel). Web `ADMIN_APP_URL` should be
   `https://admin.onwei.in` (also the code default). No Resend setup is needed for the admin subdomain: nothing sends
   from it.
5. Real SMS and WhatsApp provider (Phase G). Phone sign-in is refused on the live production site until then.
6. Set GST rates and HSN codes per product, shop rules in Settings, the marquee text.

## 3. Build order

| Phase | What                                                                     | Needs before starting                                                             | Visible while prod is in WAITLIST mode? |
| ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------- |
| A     | Insider codes, tiers, Insider email, address form, admin Insiders page   | Sender address choice (section 12), Figma or approved layout for the address form | Yes                                     |
| B     | Coupon engine and admin coupon builder                                   | Phase A                                                                           | Admin only                              |
| C     | Sign-in (email real, SMS and WhatsApp static), entry popup, account page | Figma access (section 14)                                                         | Hidden until launch                     |
| D     | Cart, shipping fee, COD setting                                          | Figma                                                                             | Hidden until launch                     |
| E     | Checkout, orders, Razorpay, COD orders, confirmation emails              | Razorpay account with KYC                                                         | Hidden until launch                     |
| F     | Returns for customers, admin return rules                                | Phase E                                                                           | Hidden until launch                     |
| G     | Real SMS and WhatsApp providers, launch checks                           | DLT and Meta registration                                                         | Flip to LIVE is the owner's call        |
| H     | 21-day pre-order campaign (section 14a)                                  | Answers to section 14a questions, Phase E done                                    | Later                                   |

---

## 4. Phase A: Insider codes

### What a member gets

- One personal code, `WEI` + 4 digits (as in the emailer, for example `WEI7820`). Random, never sequential, never reused.
- Never expires, usable on every order.
- **Recommended, needs a yes:** the code only works for the person it belongs to. At checkout the signed-in customer's
  verified email or phone must match the waitlist entry. This stops sharing, and makes guessing a 4-digit code useless.

### How much discount

- **Default Insider discount: 5%**, editable in admin.
- **Tiers by signup date** (optional): each row is "signed up between date X and date Y gets N%". A member's tier comes
  from their waitlist signup time (dates read in India time). Overlapping tiers can't be saved. Members outside every
  tier get the default.
- The percentage is looked up when the discount is applied, not baked into the code. Changing a tier changes it for
  everyone in that tier from then on. Past orders keep what they actually got.
- No global cap or combine switch for Insiders. Each coupon decides whether it can be used together with the Insider
  discount, and its own maximum (section 5).

### Giving out codes

- Code column on `WaitlistEntry` (unique). Existing entries get codes in a one-off backfill.
- New signups get a code when they join, and the existing welcome email shows it.
- When a waitlist member signs in with the same verified email or phone, the records are linked, so checkout and the
  account page know they are an Insider.

### The Insider email (from the PDFs)

- Content as in the PDFs: envelope and Insider card artwork, "Hi [first name]," (first word of the name, sensible
  fallback "Hi there,"), "A LITTLE THANK YOU FROM US.", body copy, dashed code box, "SHARE YOUR ADDRESS" button with pin
  icon, "Takes about 20 seconds.", "Sakshi & Sabhya" signature, "We're on the Wei.", logo.
- One responsive email covering the 640px and 375px layouts. Built with tables and inline styles, images hosted on the
  site, plain-text version, unsubscribe link in the footer.
- The email does not state the percentage ("Details will come by message"), so tiers can change without contradicting
  anything already sent.
- Artwork needed from the client as separate files: envelope with card, signature, footer logo. If only the PDF exists,
  export tightly cropped images (see the export gotcha in `CLAUDE.md`).

### Sending to the existing members

- Admin **Insiders** page, "Email codes to Insiders":
  1. Shows how many will get it and how many are skipped (unsubscribed, already emailed).
  2. "Send me a test first" sends the real email with a sample name and code to the signed-in staff member.
  3. Sends in small batches. Each member records when it was sent, so pressing again only reaches people who missed it.
     A failed send is retried, never duplicated.
- Every email is logged (`EmailMessage`, see `docs/EMAIL_PLAN.md`). Audit log entry for the bulk send.

### "Share your address" (physical card)

- Opens a short page on the site from a private link (signed token per member, no login).
- Form: name, phone, address line 1 and 2, PIN code, city and state (filled from the PIN where possible).
- The member can reopen the link to correct it. The link expires after 90 days. Rate limited.
- Admin: submitted addresses, CSV export for posting, "Mark card posted". New permission `insiders:view`.
- Design: `apps/web` page, needs Figma or an approved layout (ground rule 8).

### Consent check (done 2026-11-09, legal defaults updated the same day)

- Waitlist checkbox reads "I agree to Onwei contacting me about the launch and accept the Privacy Policy". The default
  Privacy Policy says we use details to "send you updates you asked for, such as Insiders news and launch alerts".
- **Verdict: the Insider thank-you email with the code is covered.** It is Insiders news tied to the launch. It still
  carries an unsubscribe link, and unsubscribed members are skipped.
- Two gaps to fix in the legal text before sending (checked against the default text in
  `packages/core/src/legal/defaultLegalContent.ts`; prod's CMS copy may differ, so check it in admin Legal pages):
  1. Privacy Policy lists addresses only "when you place an order". Add "or when you ask us to post you something".
  2. Terms "Coupons and offers" says "we may withdraw an offer at any time", which clashes with a "lifetime" code. Add
     a short Insider clause: personal to you, can't be transferred or exchanged for cash, percentage may change,
     misuse can lead to it being withdrawn.
- The default legal text is marked as needing a lawyer's review before launch. That still stands.

---

## 5. Phase B: Coupon builder and coupon safety rules

### The builder (one form, plain questions)

| Question in the form            | Choices                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **What does the customer get?** | % off, flat ₹ off, buy X get Y free, tiered by cart value (spend ₹2,000 get 10%, ₹3,500 get 15%), free shipping |
| **Maximum discount per order**  | ₹ amount, or no maximum. Shown for % and tiered types                                                           |
| **On what?**                    | Whole cart, chosen categories, chosen products. Option: "Don't apply to items already on sale"                  |
| **Who can use it?**             | Everyone, first order only, Insiders only, specific customers (by email or phone)                               |
| **When does it apply?**         | Minimum cart value, minimum number of items                                                                     |
| **How often?**                  | Total uses, uses per customer, start and end date and time (India time), on or off                              |
| **How is it applied?**          | Customer types the code, or applies automatically when conditions are met                                       |
| **Can it be combined?**         | "Can be used with other coupons" yes or no. "Can be used with the Insider discount" yes or no                   |
| **Payment method**              | Works with prepaid and COD, or prepaid only                                                                     |

### How discounts are worked out (fixed order, same everywhere)

1. Start from each line's selling price (GST inclusive).
2. Insider discount, if the customer is an Insider and no coupon in the cart forbids it.
3. Item-level coupons (scoped to categories or products), by priority.
4. Cart-level coupons, by priority. A coupon's minimum cart value is checked against the cart **after** earlier discounts.
5. Each coupon's maximum is applied to that coupon alone.
6. Shipping fee and COD fee are added last and never discounted, except by a free-shipping coupon.

### Coupon safety rules (non-negotiable)

1. **Server decides everything.** The browser sends a code and a cart, never an amount. Every page view of the cart,
   checkout review, and the final "place order" recomputes from scratch.
2. **Money in paise (integers).** No floating point. Rounding is done once per line, half up, and a cart-level discount
   is spread over lines in proportion to their value, with the last paisa going to the largest line. This matters for
   returns (rule 11).
3. **A line can never go below ₹0, and the order can never go below the shipping fee.** If the sum of discounts would,
   it is clamped and the clamp is recorded.
4. **Combine rules are checked both ways.** If coupon A says "can't combine" and B says "can", they still can't be used
   together. The customer sees which one blocks the other.
5. **Automatic offers:** if several match and they can't combine, the one that saves the customer the most wins. Ties go
   to the earliest created. The customer can always see which offer was applied and why.
6. **Usage limits are race-proof.** The use count is reserved inside the same transaction that creates the order, with
   a row lock or atomic increment. Two people can't both take the last use. A cancelled or unpaid (expired) order gives
   its use back.
7. **Per-customer limits use identity, not account.** A use counts against the verified email and the verified phone,
   so a second account with the same phone can't reuse a "one per customer" code.
8. **"First order only"** means no earlier order past payment (or confirmed COD) on that email or phone.
9. **Codes:** case-insensitive, spaces trimmed, letters and digits only, unique across coupons and Insider codes.
   Wrong-code attempts are rate limited per person and per IP. The message never says whether a code exists but is
   expired versus never existed, to stop guessing.
10. **Editing a used coupon:** once a coupon has any use, its discount type, value, maximum, scope and combine rules are
    locked. Staff can still change dates, limits, on/off and description. To change the deal, duplicate it into a new
    coupon. Deleting a used coupon is not allowed, only switching it off.
11. **Returns and cancellations:** the refund is what the customer actually paid for the returned lines (their share of
    every discount, from rule 2), never the list price. If a partial return drops the remaining order below a coupon's
    minimum, we do not take money back (industry norm, keeps it simple). This is written in the Terms.
12. **Every coupon change writes an audit row** (who, when, before and after). Every applied discount is stored on the
    order and its lines (price snapshot rule), so a past order never changes when a coupon is edited.
13. **Admin preview** on the coupon form: "A ₹2,400 cart with 2 items would get ₹360 off". Uses the same engine as
    checkout, never a separate copy.
14. **Tests before release:** every type, every combine pair, rounding to the paisa, limits under concurrent use,
    expired or not-started dates at the minute boundary in India time, Insider plus coupon, return of a discounted line.

### What exists vs what changes

- Exists: `Coupon` (code, active, dates, total and per-customer limits, min order value), `DiscountRule` with
  `PERCENTAGE`, `FLAT`, `BUY_X_GET_Y`, zod-validated config, admin Coupons list and create page.
- Adds: maximum, scope, audience, min items, auto-apply, two combine flags, payment-method restriction, `TIERED` and
  `FREE_SHIPPING` types, lock-after-use, duplicate, usage report.
- `CouponRedemption.orderId` is unique today (one coupon per order). Becomes unique on (order, coupon).
- All math in `packages/core/src/discounts` (ground rule 3, `discount-rule-engine` skill).

---

## 6. Phase C: Sign-in, entry popup, account page

### Sign-in

- Customer enters an email or a phone number, picks how to get the code where it applies (SMS or WhatsApp for phones).
- Email codes are real (Resend). SMS and WhatsApp codes are static for now (section 7).
- The existing OTP flow is extended, same rate limits and session cookie. OTP challenges gain a channel.

### Entry popup

- Shown once per browser on the first storefront visit (not on `/ontheway`, legal pages, or to bots).
- "Sign in" and "Continue without signing in". Closing it counts as continue. It never comes back on every page.
- Line for Insiders: "On the waitlist? Sign in with the same email or phone to unlock your Insider discount."

### Signed-in Insiders

- Small "Insider" badge in the header or cart.
- Cart and checkout show: "You're an Onwei Insider. Apply your 5% off" with an Apply button. Code can also be typed.

### Account page (`/account`)

- **Profile:** name (editable), email and phone with "verified" marks, add the missing one with a code.
- **Insider card:** code, current %, card posted or not.
- **Orders:** "Current" (confirmed, packed, shipped, out for delivery) with a status timeline, and "Past" (delivered,
  cancelled, returned, refunded). Order detail: items, full price breakdown with each discount, address, payment
  method and status, tracking number, invoice download once invoicing exists, "Return items" when allowed (Phase F).
- **Addresses:** add, edit, set default.
- **Sign out**, link to the data and privacy request flow.

---

## 7. Static SMS and WhatsApp codes: launch blocker

A static code means anyone who knows it can sign in as any phone number and see that person's orders, addresses and
Insider discount. So:

- The static code lives only in an env var (`OTP_STATIC_CODE`), never in git, never shown in the UI.
- It is **refused** in production while the site is LIVE. In production before launch (WAITLIST mode, storefront
  hidden) and in dev and preview, it works.
- Email codes are real from day one, so launch can go ahead with email sign-in even if SMS and WhatsApp are not ready.
  Phone sign-in is hidden at launch until a real provider is wired.
- Phase G replaces the static code with real providers (section 13).

---

## 8. Phase D: Cart, shipping fee, COD

### Cart

- Guests and signed-in customers both have one. A guest cart lives under a random cookie id and merges into the
  customer's cart on sign-in (quantities added, capped by stock).
- PDP "Add to cart" (drawn but disabled today) works with size and colour chosen.
- Cart view per Figma: items, quantity, remove, stock warnings, coupon box, Insider card, price breakdown, delivery
  fee shown before checkout (no surprise fees), "Checkout".

### Shipping fee (standard Indian practice, all values editable in admin Settings)

- **Free delivery above a cart value, flat fee below.** Suggested start: free above ₹999, ₹99 below. Most Indian fashion
  and sportswear stores sit between ₹499 and ₹1,499 for the free threshold and ₹49 to ₹149 for the fee.
- The threshold is checked on the amount after discounts (what the customer pays for goods).
- The cart shows a nudge: "Add ₹230 more for free delivery".
- PIN code check before payment: serviceable or not, and an estimated delivery window once a delivery partner exists.
  Until then, staff ship by hand and enter the tracking number.

### Cash on delivery (admin Settings)

- On or off.
- Optional COD fee (suggested ₹49, common range ₹0 to ₹99).
- Maximum order value for COD (suggested ₹5,000), and minimum if wanted.
- COD orders still need a verified sign-in. A COD order is confirmed without payment and marked "to collect".
- Coupons can say "prepaid only" (section 5).

### GST (prices inclusive)

- Product pages, cart and checkout say "Inclusive of all taxes".
- Each product gets an HSN code and GST rate in admin (apparel rates depend on price slabs, so never hardcode a rate).
  The GST part of each line is worked out from the price actually paid after discounts and stored on the order line,
  ready for invoices.
- Tax invoices are not built here (separate decision, `CLAUDE.md` says GST invoicing is not started). The stored
  numbers make a manual or later automated invoice possible.

---

## 9. Phase F: Returns

### Admin return rules (new Settings section "Returns")

- **Return window:** days after delivery (suggested 7, common range 7 to 30).
- **What can be returned:** default yes, switch off per category or per product (for example socks, innerwear).
  "Sale items returnable" yes or no.
- **What the customer can choose:** refund, exchange for another size, or both.
- **Reasons list** (editable): wrong size, damaged, not as described, changed my mind, other. Optional photo upload for
  "damaged".
- **Condition note** shown to the customer (unused, tags attached, original packaging).
- **Return shipping:** we arrange pickup, or customer ships it back. Optional return fee.
- **Refund to:** original payment method for prepaid (Razorpay refund), bank or UPI details for COD orders.

### Customer flow

- From the order page: "Return items" while the window is open and items are returnable. Pick items, quantity, reason,
  refund or exchange. Clear summary of the refund amount (section 5, rule 11) before submitting.
- Status shown on the order: requested, approved, picked up, received, refunded (or rejected with the reason).

### Admin

- Existing `ReturnRequest` model and admin returns pages are wired to real orders. Approve or reject with a reason,
  mark received, issue refund (Razorpay refund for prepaid, record a manual payout for COD). Stock goes back on
  "received in good condition". Audit rows on every money and stock step.

---

## 10. Phase E: Checkout, orders, Razorpay

### Checkout steps

1. **Verify:** sign in if not already (no guest payment).
2. **Address:** saved address or a new one, PIN check, city and state from PIN.
3. **Review:** items, each discount by name, delivery fee, COD fee if chosen, "Inclusive of all taxes", total.
4. **Pay:** Razorpay (UPI, cards, net banking, wallets) or Cash on delivery when enabled and allowed.
5. **Result:** success page with order number and what happens next, or a clear failure page with "Try again" that
   keeps the cart.

### The money path (server)

1. "Place order" recomputes the full price and creates the `Order` as `PENDING` with price snapshots, discounts used,
   reserved coupon uses, and a stock reservation held 15 minutes.
2. Razorpay order created for the exact total in paise; its id goes to the browser.
3. After payment the browser sends Razorpay's payment id and signature. The server verifies the signature in constant time.
4. Razorpay's webhook (`payment.captured`, `payment.failed`) is verified and handled too. Whichever arrives first wins;
   the second is a no-op (idempotent on the Razorpay payment id).
5. On success, one transaction: `PENDING` to `CONFIRMED` (compare-and-set), `Payment` row, stock decremented and
   reservation released, coupon redemptions confirmed, status history and audit rows.
6. A scheduled job cancels unpaid orders after the hold and gives back stock and coupon uses.
7. Paid after the hold expired and stock is gone: order flagged for staff, default action automatic full refund.
8. COD: same path without step 2 to 4, confirmed straight away if COD is allowed for this order.
9. Confirmation email to the customer, new-order alert to staff.

### Admin

- Orders pages use real orders. Payment details, "Refund" (full or partial) through Razorpay with an audit row. Staff
  move orders through packed, shipped (tracking number), delivered, and mark COD cash collected.
- `PaymentProvider` (`packages/core/src/payments`) gets its first adapter, `RazorpayProvider`.

### Razorpay setup (owner, account created 2026-11-09)

- Keys go straight into `.env.local` and Vercel env vars, never into chat or git:
  - `RAZORPAY_KEY_ID` (test `rzp_test_...`, later live `rzp_live_...`)
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET` (chosen by the owner when creating the webhook)
- Webhook (once the route exists): URL `https://<web domain>/api/payments/razorpay/webhook`, events `payment.captured`,
  `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
- Dashboard settings: payment capture automatic, methods UPI, cards, net banking, wallets; business name and logo for
  the checkout window; brand colour navy.
- Activation: KYC complete, settlement bank account added, live mode approved. Terms, privacy, refund, return and
  shipping policy pages must be live (Razorpay checks them).

---

## 11. UX and messaging standards (apply to every phase)

### Storefront UX

1. **Figma first.** Every customer screen follows Figma at desktop and mobile widths (ground rule 8). A screen with no
   frame gets an approved layout before code.
2. **Every state designed:** loading, empty, error, success, disabled, and "out of stock" for each screen and button.
3. **No surprise money.** Delivery fee, COD fee and every discount appear in the cart before checkout, by name.
   The total on the review step is the amount charged.
4. **Prices:** Indian formatting (`₹1,299`), "Inclusive of all taxes", sale price with the original struck through.
   One shared formatter in `packages/core`.
5. **Forms:** labels always visible, right keyboard on mobile (numeric for phone, PIN and OTP), OTP field supports
   paste and SMS autofill (`autocomplete="one-time-code"`), resend after 30 seconds with a visible countdown, PIN fills
   city and state, errors shown next to the field and in plain words.
6. **Never lose the customer's work.** Cart survives sign-in, failed payment and closing the tab. A failed payment
   returns to review with the cart intact.
7. **Buttons say what happens:** "Pay ₹1,299", "Place order (Cash on delivery)", "Apply", "Remove". No "Submit".
8. **Double-submit safe:** pay and place-order buttons disable while working and the server ignores repeats.
9. **Accessibility:** WCAG 2.2 AA. Keyboard reachable, visible focus, dialogs trap focus and close on Escape, colour
   contrast checked on the brand palette, screen-reader labels on icons.
10. **Mobile first** and fast: checkout works on a slow phone connection; no layout jump when prices update.

### Messaging standards

1. **One message catalog per area** (sign-in, cart, coupons, checkout, payment, returns, account). The server returns
   a reason code (`{ ok: false, reason }`, already the API convention), the UI maps it to copy from the catalog. No
   copy is invented inline in a component.
2. **Tone:** warm, short, Onwei voice, second person. Say what happened and what to do next.
   - Good: "This code has ended. Try another, or check your Insider discount below."
   - Bad: "Invalid coupon." / "Error 400."
3. **Never blame or leak.** No stack traces, no internal names, no "invalid" without a way forward.
4. **Coupon messages are specific when safe:** "Add ₹400 more to use this code", "This code can't be used with your
   Insider discount", "This code is for your first order only". For unknown or expired codes use one neutral message
   (section 5, rule 9).
5. **Money messages are exact:** "You saved ₹324", "Refund of ₹1,105 to your UPI in 5 to 7 working days".
6. **Every catalog is reviewed by the owner before its phase ships.** The catalog lives in the repo, so copy changes are
   a one-file edit.
7. **Emails:** transactional (codes, orders, returns) and marketing (offers) are separate types. Every email has a
   plain-text version, a real reply-to, and marketing ones an unsubscribe link. Subject lines say what it is
   ("Your Onwei order #1042 is on its way").
8. **Admin copy** follows the `cms-plain-language` skill: labels and help text a colleague would say.
9. **No em dashes** anywhere (project rule).

---

## 12. Email: Resend (checked 2026-11-09)

**A Resend account already exists.** Its verified domain is `mail.onwei.in` (region Tokyo, verified 2026-10-01). Local
`apps/web` sends as `Onwei Insiders <insiders@mail.onwei.in>`. Whether prod Vercel has the key set was not checked.

`sakshi.agarwal@onwei.in` is on the root domain `onwei.in`, which is **not** verified in Resend yet. Two options:

- **Option 1, no DNS work:** send as `Sakshi from Onwei <sakshi@mail.onwei.in>` with reply-to
  `sakshi.agarwal@onwei.in`. Inboxes show "Sakshi from Onwei", replies reach Sakshi. Ready today.
- **Option 2, exact address:** add `onwei.in` as a second domain in the same Resend account:
  1. Resend, Domains, Add domain, `onwei.in`, region Tokyo (same as the existing one).
  2. Add the records Resend lists at the DNS host: TXT `resend._domainkey` (DKIM), MX `send` (priority 10) and TXT
     `send` (SPF). They sit on `send.onwei.in`, so Sakshi's normal mailbox is not affected.
  3. If `_dmarc.onwei.in` has no record, add TXT `v=DMARC1; p=none; rua=mailto:sakshi.agarwal@onwei.in`.
  4. Click Verify (minutes to a few hours).
  5. Set `EMAIL_FROM="Sakshi from Onwei <sakshi.agarwal@onwei.in>"` and reply-to in both Vercel projects.
     Trade-off: any spam complaints then land on the main domain that Sakshi's own mail uses. At 200 friendly
     recipients the risk is low.

Either way:

- Plan: free tier is 100 emails a day. 200 Insiders in one go needs Pro (about $20 a month), or two days on free.
- Sign-in codes and order emails should later use their own sender (for example `orders@mail.onwei.in`), so a
  marketing complaint never delays a customer's code.
- Test a send to Gmail and Outlook and confirm inbox placement before the bulk send.

## 13. SMS and WhatsApp providers (last phase)

- SMS in India needs DLT registration (business, sender id, each template). Usually 1 to 2 weeks.
- WhatsApp needs Meta Business verification, a number not used in the WhatsApp app, an approved authentication template.
- One provider for both (MSG91 or Gupshup) keeps it simple. Starting registration early removes the wait later.

## 14. Figma inventory (checked 2026-11-09)

File: "On Wei || Checkout, Pre-order, Cart, Contact US" (`TgMpkXMC2QpghHlH6N63oV`), page "Dev Ready" (758:2217). The
"Design" page holds older copies of the same frames and nothing extra for these flows.

### Present

| Screen                                         | Desktop                     | Mobile        | Notes                                                                                                                 |
| ---------------------------------------------- | --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cart drawer, with items                        | 1217:3338 (580 wide)        | none          | Progress bar with three milestones, "You'll also love" row, "Add discount code" link, "Continue to checkout - ₹3,000" |
| Cart drawer, empty                             | 1217:3486 (540 wide)        | none          | "Made for everyday play", "Shop pickleball"                                                                           |
| Pre-order pop-up                               | 1257:5853                   | 1257:6151     | Three "laps" with falling discounts, countdown, "Reserve for ₹900"                                                    |
| Pre-order banner (3 states)                    | 1257:7003                   | in same frame | Lap 1 live, lap 2 live, final lap live                                                                                |
| Pre-order marquee                              | Design page 1233:3238       |               | Not on Dev Ready                                                                                                      |
| Payment successful                             | 1257:7316                   | 1257:7898     | Order number, progress (placed, packing, shipped, delivered), details, "Track your order"                             |
| Payment failed                                 | 1257:7520                   | 1257:8064     | "Try payment again", "Use another method", "Your cart's saved"                                                        |
| Checkout abandoned                             | 1257:7695                   | 1257:8202     | Steps "Cart, Details, Payment", "Complete checkout"                                                                   |
| Contact Us                                     | 1189:6005                   | 1189:6203     | Not built yet, separate from this plan                                                                                |
| Header with "Insiders", account and cart icons | inside the pre-order frames |               | Header change for launch                                                                                              |

### Missing (approved 2026-11-09: design in the existing style)

Built from the checkout frames' parts: yellow page, navy headings in the display font, mono body copy, white rounded
cards with navy borders, navy pill buttons, purple help card, same header and footer. Each new screen is screenshotted
at desktop and mobile and shown to the owner before its phase ships.

1. **Checkout "Details" step**: contact, sign-in or OTP, shipping address, delivery option.
2. **Checkout "Payment" step**: method choice including COD, final review. (Razorpay's own window handles card and UPI
   entry, but the step around it is not drawn.)
3. **Sign-in and OTP** screens or pop-up (email, SMS, WhatsApp).
4. **Entry pop-up** (sign in or continue). The pre-order pop-up may be meant to fill this slot; needs a decision.
5. **Account page**: profile, orders, addresses, Insider card.
6. **Order detail and "Track your order"** page (the success page links to it).
7. **Returns flow** for customers.
8. **Insider "Share your address" page** (the email button lands here).
9. **Cart drawer on mobile** (only 580 and 540 wide frames exist).
10. **Discount code states** in the cart: input open, applied, error, Insider discount offer.
11. Admin screens need no Figma (admin has no design system).

### Contradictions (resolved 2026-11-09)

- Free shipping threshold differed in three places (₹500, ₹1,500, ₹3,000). Now one admin value; every place that
  mentions it (cart bar, cart footer, marquee) reads that value.
- Cart milestones "free gift at ₹1,000" and "extra 10% at ₹1,500" are not real offers. The cart bar keeps the Figma
  look but shows one milestone: free shipping.
- Currency written as both "Rs." and "₹". The build uses "₹" everywhere (section 11).

## 14a. Pre-order campaign (Phase H, later)

Owner decision 2026-11-09: build later, keep here so the earlier phases leave room for it (lap discount as a
discount source in the engine, reservations as an order type). Figma shows a 21-day launch pre-order:

- Three "laps": Lap 1 (days 1 to 7) 30% off plus a big mystery box, Lap 2 (days 8 to 14) 20% plus a mystery box, Final
  lap (days 15 to 21) 10% plus a mini mystery box. The earlier you reserve, the bigger the saving.
- "Reserve for ₹900": a ₹900 payment holds the product and is "redeemable against the final discounted value".
- Countdown per lap, pop-up, banner, marquee, lap states (closed, live, locked).

What it needs (proposal, all admin-configurable):

- Campaign settings: start date, laps (dates, %, reward name), reserve amount (₹900), which products.
- Reservation: customer signs in, picks product and variant, pays ₹900 through Razorpay. The lap's discount is locked
  to that reservation at payment time.
- Balance payment when stock is ready: customer gets an email, pays the rest (price minus lap discount minus ₹900)
  through the normal checkout, order ships.
- Mystery box: a free item added to the order by lap, tracked as stock.

Questions before it can be planned in detail:

1. Is the ₹900 refundable if the customer changes their mind? Until when?
2. Does the lap discount stack with the Insider discount and coupons? (Default proposal: no, the customer gets the
   better of the two.)
3. One reservation per product per customer, or any number?
4. Is it one ₹900 per item or per order?
5. When does the balance get paid, and what if the customer never pays it?
6. Is this happening before the full store opens (launch sequence: waitlist, pre-order, live)?
7. Does it replace the entry pop-up during the 21 days?

This needs Razorpay early, so it changes the build order: Razorpay moves before the full cart if pre-orders come first.

## 15. Schema changes (summary, each goes through the `db-migrations` skill and a prod migration by the owner)

| Where                             | Change                                                                                                                      | Phase |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| `WaitlistEntry`                   | Insider code (unique), emailed time, link to `Customer`, card address (or related table), card posted time                  | A     |
| New `InsiderTier`                 | start, end, percent                                                                                                         | A     |
| `SiteSetting`                     | default Insider %                                                                                                           | A     |
| New `EmailMessage`                | log of every email, idempotency key, status                                                                                 | A     |
| `Coupon` / `DiscountRule`         | maximum, scope, audience, min items, auto-apply, combine flags, payment method, `TIERED`, `FREE_SHIPPING`, locked once used | B     |
| `CouponRedemption`                | unique on (order, coupon), reserved vs confirmed                                                                            | B     |
| OTP challenge                     | channel (email, SMS, WhatsApp)                                                                                              | C     |
| `Cart`                            | guest id                                                                                                                    | D     |
| `SiteSetting`                     | free-delivery threshold, delivery fee, COD on/off, COD fee, COD min and max                                                 | D     |
| `Product`                         | HSN code, GST rate                                                                                                          | D     |
| `Order` / `OrderItem` / `Payment` | Razorpay ids, payment method, reservation expiry, discount breakdown, GST part per line, COD collected                      | E     |
| Return settings, `ReturnRequest`  | window, returnable flags, reasons, refund or exchange, refund destination                                                   | F     |

Soft deletes on customer-facing rows, price snapshots on order lines, audit rows for money, stock and access changes
(ground rule 6).

## 16. Testing (ground rule 4, plus extra for money)

- Unit: every discount type, tiers, maximums, scope, audience, combine pairs, calculation order, paisa rounding and
  spreading, shipping threshold after discount, COD limits, refund share for a returned line.
- Integration (real DB): code backfill uniqueness, owner-lock, usage limits under concurrent orders, uses returned on
  cancel and expiry, cart merge, reservation and expiry, payment success and failure, duplicate webhook, refund, return.
- Razorpay signature verification with good and tampered payloads.
- Static OTP refused when production is LIVE.
- E2E (Playwright, Razorpay test mode): guest to sign-in to pay, Insider discount, blocked combination, COD order,
  account shows the order, return request.
- Manual on the deployed site before launch: failure, retry, refund, two browsers racing for the last item.

## 17. Security and privacy checklist

- Prices, discounts and totals only computed on the server. Signatures verified in constant time.
- New public endpoints validated with zod (`parseJsonBody`) and rate limited (`createLazyLimiter`), coupon attempts
  included.
- Order, payment and return state changes are compare-and-set transactions with history and audit rows.
- Addresses and phones are personal data: staff permissions, never logged, included in data export and delete.
- Secrets only in Vercel env vars and `.env.local`; `.env.example` lists every new variable name.

## 18. Still open

1. (Answered 2026-11-09: locked to its owner.)
2. (Answered: 5% for everyone, tiers available in admin.)
3. Starting values for admin settings (all editable later): free shipping threshold, delivery fee below it, COD fee
   ₹49, COD max ₹5,000, return window 7 days.
4. Pre-order campaign: answers to the seven questions in section 14a (before Phase H only).
5. Razorpay: test keys in `.env.local`, account activation status.
6. Go-ahead to start Phase A.
