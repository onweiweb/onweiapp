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

### 2026-11-18: SMS sign-in codes through MSG91, and the SMS log (local, not pushed)

Onwei makes and checks the code; MSG91 SendOTP only delivers it (`packages/core/src/messaging/sms`: POST
`control.msg91.com/api/v5/otp`, `authkey` header, `template_id`, `mobile`, `otp`, `otp_expiry` in the query, 10s timeout).
`phoneOtpMode` returns `sms` once `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID` are set (web only), so SMS works on the live
site from then on; before that it stays refused on live prod. Sign-in and My Account phone codes both use it; a failed send
shows `SMS_SEND_FAILED` ("try WhatsApp or email"). Every send is logged in `SmsMessage` (no code kept), delivery reports
arrive at `/api/webhooks/msg91/<MSG91_WEBHOOK_TOKEN>` (MSG91 > OTP > Webhook, "On Report Received", JSON, status 1
delivered, 2 and rejected or blocked codes failed). Admin "Text messages" (`/sms`, `settings:view`): 30-day counts, most
common problem, log with status and number filters, masked numbers. Migration `20261118120000_sms_messages` (new table
only) must be run on prod before the push. Verify the request format and the request id match on the first live send:
MSG91's docs site would not load in full while building.

### 2026-11-17: Copy address link in Insiders > Members (pushed fbf5b48)

While WhatsApp templates wait for approval, staff send address forms by hand. Members has an "Address link" column:
Copy link (the member's private `/insider/address` link, `insiderAddressUrl`) and Copy message (ready-to-paste WhatsApp
text, `insiderShareMessage`), plus "Address shared" or "No address yet" (`hasCardAddress` from `listWaitlistEntries`).
Members without a code show "Give them a code first". Each copy is a fresh 90-day token for the same member, so every
link (email, WhatsApp, copied) opens the one saved address. No schema change.

### 2026-11-17: WhatsApp message log (pushed c1f178e)

Admin WhatsApp has tabs Messages and Log (`?tab=log`). The log lists every `WhatsAppMessage`, newest first, 50 a page,
filtered by message, status and number ending, with the name (Insider or customer), masked number (`maskPhone`), status
badge, time to deliver/read/fail and WhatsApp's failure reason. "Most common problem" on the Messages tab links to the
failed rows. Core `listWhatsAppMessages`. No schema change. "Message Sending failed as template did not match" is
WhatsApp's error relayed by Gupshup's webhook, usually a template that isn't approved yet, or values or header that
don't match it.

### 2026-11-17: WhatsApp templates picked from Gupshup (local, not pushed)

Admin WhatsApp > Edit has "Pick from Gupshup": lists the app's templates live (`GET
https://api.gupshup.io/wa/app/<GUPSHUP_APP_ID>/template`, header `apikey`, confirmed on the live account) and fills in
ID, name, language, header, the approved text and the value order (body values, then button values: sign-in
code, code; Insider first name, code, address token). Image templates prefill Gupshup's public sample image. Video
headers can't be sent yet and are flagged. Sign-in codes need an Authentication template; the other two accept Utility
or Marketing (Meta moved our waitlist templates to Marketing). The WhatsApp table shows each saved template's approval
status (cached 60s), and saving with "Send this message" on is refused while Gupshup shows it as not approved. New env
`GUPSHUP_APP_ID` (admin; not secret) must be added on the admin Vercel project.

### 2026-11-17: Insider email "Send to chosen Insiders" (local, not pushed)

Admin Insiders > Email has "Send to chosen Insiders" next to the test send: search by name, email or code, pick up to 10,
send their real email (and Insider WhatsApp). They are marked as sent so the bulk send skips them; re-sending to someone
already emailed needs a second confirmation (`resend: true`, otherwise 409). Unsubscribed people and people with no
code can't be picked. Routes `GET /api/insiders/email/recipients`, `POST /api/insiders/email/selected`; audit action
`insider.email.send_selected`. No schema change. Counts towards the 100 emails a day (no live counter exists).

### 2026-11-17: Client feedback round "Pilates to come on top" (local, not pushed)

- Homepage: Pilates banner first, stamp on both banners; order is banners, About (mobile trimmed to the first
  paragraph), Shop our gear (new "Seriously fun fitness gear for everyday movers." statement), reviews, "Designed to Move
  and Play" (16:9 desktop, 9:16 mobile, YouTube links in admin Settings > Homepage, cards slide in one by one), Join
  the Movement. Showcase and extra mobile marquees removed. "find your wei" off the header and mobile menu (footer keeps it).
- Reviews: "Write a review" popup (homepage, category pages, product pages), anyone with a valid email, saved
  unapproved (`Review.source = SITE`, email kept private, `isVerifiedPurchase` when the email has a delivered order for
  that product), approved in admin Reviews. `POST /api/reviews`: 3 an hour per IP, hidden bot field, consent recorded.
  "Verified" label now shows only for staff-entered or imported reviews and verified site reviews.
- Reviews heading number: admin Settings > Homepage "Number of happy movers" (`SiteSetting.moversCount`), empty shows
  "Chosen by everyday movers".
- Category pages: banner image or GIF from admin Categories (`Category.imageUrl`); below the products, value props,
  comparison table (`listCategoryComparison`) and that category's reviews, then Join the Movement. Shop All unchanged.
- /insiders: "Events and Insider offers" from admin Insiders > Page updates (`InsiderUpdate`). Post-launch signups still
  get a code; their discount comes from the date tiers in Insiders > Discount (owner's call).
- Migration `20261117120000_reviews_home_video_insider_updates` adds SiteSetting columns, so prod must be migrated BEFORE
  the push. Third value-prop card copy ("Designed to Show Up") is admin content: change it on prod in Content.

### 2026-11-16: Insider email, letter version (local)

The first Insider emails went to Gmail Promotions. The client redesigned it as a letter (PDFs
"Onwei_InsiderEmail_letter" desktop and mobile): short banner, code pill, plain "Share your delivery address here" text
link instead of a big button, signature, P.S. asking to drag it to Primary. Built in
`packages/emails/src/templates/insiderCodeEmail.ts` with assets drawn in-house from existing brand art in
`apps/web/public/images/email/`: `insider-letter-header.png`, `insider-gift.png`, `insider-signature.png` (Summer Mood,
as an image because mail apps can't load it), `insider-stamp.png`. `insider-card.png` is no longer used. The unsubscribe
footer stays (not in the PDF) for the opt-out and the one-click header.

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

### 2026-11-09 (after first push): owner feedback round

Pushed as 3650c51 (web and admin). Then, from the owner's testing, built locally (not pushed):

- **Add to cart on product cards** opened the product page whenever a product had more than one option (almost every
  product). Now a small option picker opens in place (same colour and size pills as the product page, sold-out options
  marked, "See full details" link); picking adds to the bag and opens it. Same in the bag's "You'll also love" row.
  `quickAddProduct` returns the options (`QuickAddChoice`) instead of only a slug.
- **Header:** account, order details and sign-in pages now use the full site header (account and bag icons).
  Checkout and its result pages keep the plain header on purpose (no distractions mid-payment, matches Figma).
- **Entry popup** now shows once per visit until sign-in (see section 6). **Sign-in copy** shortened.
- **Checkout sign-in:** signing in can change the bag (saved items merge in, Insider discount applies), so the bag
  opens right after sign-in for a quick review; "Back to your bag" link on the sign-in step.
- **Razorpay window** closes only on purpose: no Esc, no click outside, and the close button asks to confirm.
- **Payment failed page:** shows Razorpay's actual reason in plain words (`paymentFailureMessage`, from `error.reason`
  carried as `?why=`), how many minutes the items are still held (`OrderDetail.holdExpiresAt`), "Start again" when the
  hold has ended instead of a retry that bounces, and "Pay on delivery instead" (opens checkout on the payment step
  with COD picked, `/checkout?pay=cod`) when COD is allowed for that total.
- **Coupons:** Pause / Resume and Delete on the list and the edit page. Delete only works for codes never used on an
  order (orders keep their history); used codes can only be paused. Audit-logged as `coupon.delete`. The builder
  preview is now a purple panel; the result turns navy and green when the code applies, red when it doesn't.
- **Emails:** the Insider email used the PDF's washed-out green (#d0e191); now the brand yellow-green #eded86 like the
  other emails, with `bgcolor` fallbacks for mail apps that drop CSS backgrounds.

Before launch (all after the phases, as agreed):

1. Prod migrations (owner, `DIRECT_URL`): the five migrations from 2026-11-09. Done by the owner 2026-11-09.
2. Vercel env, web: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `INSIDER_LINK_SECRET`,
   `CRON_SECRET`, `ORDER_ALERT_EMAIL` (optional), `ADMIN_APP_URL`, `OTP_STATIC_CODE` (until providers). Admin:
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `INSIDER_LINK_SECRET`, `RESEND_API_KEY`, `INSIDER_EMAIL_FROM`,
   `INSIDER_EMAIL_REPLY_TO`, `WEB_APP_URL`.
3. Razorpay webhook: `https://<web domain>/api/payments/razorpay/webhook`, events payment.authorized, payment.captured,
   payment.failed, order.paid, refund.processed, refund.failed. Created in test and live mode; live secret set on web
   2026-11-09 (owner).
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
- **New members:** only the welcome email goes out at signup. The automatic Insider code email (added 2026-11-15) was
  removed on 2026-11-16 at the owner's request. New Insiders wait on the admin "Email" list ("Not sent yet") until staff
  press send. Each signup uses 1 of the Resend free plan's 100 emails a day.

### "Share your address" (physical card)

- Opens a short page on the site from a private link (signed token per member, no login).
- Form: name, phone, address line 1 and 2, PIN code, city and state (filled from the PIN where possible).
- The member can reopen the link to correct it. The link expires after 90 days. Rate limited.
- Admin: submitted addresses, CSV export for posting, "Mark card posted". New permission `insiders:view`.
- Design: `apps/web` page, needs Figma or an approved layout (ground rule 8).

### Printed Insider cards (added 2026-11-15)

Owner decisions: one print run of 500 cards that includes every existing code; generic design, code only, no names;
a free card goes to the next person who joins the waitlist (no online claim, no staff assign); the QR opens the website
tagged `utm_source=insider-card`, `utm_medium=print`, `utm_campaign=insider-cards` (no secret, since a code only works
for its owner anyway).

- Table `InsiderCode` (migration `20261114204559_insider_code_pool`): one row per card, `code`, `cardNumber` (printed
  small on the card so staff can find it), optional owner, `assignedAt`. `WaitlistEntry.insiderCode` stays the code
  checkout reads.
- Core `packages/core/src/insiders/codePool.ts`. `fillInsiderCodePool` gives members who have a code a card number
  first (oldest signup first), then adds random free codes up to 500. Safe to press twice, one fill at a time
  (advisory lock), audit logged. `takeFreePrintedCode` hands out the lowest free card with `FOR UPDATE SKIP LOCKED`.
  `assignInsiderCode` tries it first and falls back to a random code with no card when every card is taken.
- A card is free only while it has no owner and no `assignedAt`. A removed member's card keeps `assignedAt` and is
  never given to anyone else, because it may already be in the post.
- Admin Insiders, "Printed cards" tab: counts, a low-stock warning under 25, "Set up 500 cards" / "Add N cards"
  (`waitlist:manage`), and "Download list for the printer" (card number, code, QR link, no personal data, `?from=N`
  for a reprint). Card addresses tab and CSV show the card number to post.
- Prod rollout: migrate prod, push, then press "Set up 500 cards" on prod admin, download the list and send it to the
  printer. Ask for a proof of a few cards first.
- Dev note: DB integration tests that create and delete waitlist rows can use up dev cards (they show as "removed").
  Prod never runs those tests.

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

- Shown once per visit (browser tab session) to signed-out visitors, until they sign in. Changed 2026-11-09 from
  "once per browser ever", which meant it never showed again after a first close. Not on `/ontheway`, `/insider`,
  legal pages, checkout, account, sign-in, or to bots, and never on top of the bag or the option picker.
- "Sign in" and "Continue without signing in". Closing it counts as continue for that visit.
- Copy kept short (owner, 2026-11-09): "Sign in for faster checkout and your Insider discount."
- Sign-in intros are one line: "We'll send a one-time code." (popup), plus "Waitlist members, use the same email or
  phone." on `/login` and "Your bag stays as it is." at checkout.

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
- Phase G replaces the static code with real providers (section 13). WhatsApp is built (Gupshup, 2026-11-16) and takes
  over once its sign-in template is switched on in admin. SMS still waits for DLT.

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

- SMS in India needs DLT registration (business, sender id, each template). Usually 1 to 2 weeks. Not started, SMS still
  uses the static code.
- WhatsApp needs Meta Business verification, a number not used in the WhatsApp app, an approved authentication template.

### WhatsApp through Gupshup (built 2026-11-16)

Owner picked Gupshup. Code in `packages/core/src/messaging/whatsapp/`, admin page `/whatsapp` (Settings group).

- **Messages are rows, not env vars.** `WhatsAppTemplate` holds one row per kind of message (`WhatsAppPurpose`):
  Gupshup template ID (not Meta's), name, language, the ordered values to fill in (`{{1}}`, `{{2}}`, ..., picked from a
  fixed list per message in `purposes.ts`, repeats allowed), header (none, text, image with an uploaded link), the
  approved text for reference, and on/off. Off by default. Saving writes an audit entry. A new kind of message is a new
  enum value, an entry in `purposes.ts` and a call site.
- **The three messages:**
  1. `SIGN_IN_CODE` (Authentication, Copy code button, no image): real random codes for WhatsApp sign-in and "add phone"
     in My Account. Once on, WhatsApp sign-in works on the live site (`phoneOtpMode` mode `whatsapp`). If the send
     fails the shopper sees "couldn't send on WhatsApp, use email". Off or not connected: the old static-code rules.
  2. `WAITLIST_JOINED`, shown in admin as "Welcome to Insiders" (Utility, image header): right after a signup (the
     waitlist page before launch, `/insiders` after), in the background next to the welcome email.
  3. `INSIDER_CODE` (Marketing, image header, "Share my address" dynamic URL button whose value is the signed address
     token): sent with each Insider email when staff press send on Insiders > Email, to every member with a phone
     (owner's decision 2026-11-16, old members included). A WhatsApp failure never undoes the email.
- **Connection (env, web and admin):** `GUPSHUP_API_KEY`, `GUPSHUP_APP_NAME`, `GUPSHUP_SOURCE_NUMBER`; web also
  `GUPSHUP_WEBHOOK_TOKEN`.
- **Send log:** `WhatsAppMessage` per send (purpose, phone, waitlist entry or customer, Gupshup message id, status,
  failure reason, times). Never the sign-in code or the address token. Admin shows 7-day counts only.
- **Webhook:** `POST /api/webhooks/gupshup/<GUPSHUP_WEBHOOK_TOKEN>` (Gupshup format v2, unsigned, so the token in the
  path is checked in constant time; 404 on mismatch). Delivery updates move a message forward only (compare-and-set,
  a late "sent" never overwrites "read"). A reply of STOP or UNSUBSCRIBE adds the number to `WhatsAppOptOut`, which
  blocks waitlist and Insider messages but not sign-in codes the person asks for. Other replies are ignored.
- **To confirm on the first live test:** how Gupshup wants the Copy code button and the URL button values in `params`
  (the admin value list can repeat or reorder values, so a fix needs no code change).
- **Admin page (compacted 2026-11-16):** one table row per message (status On, Off or Needs setup, 7-day counts), Edit
  and Send test open popups (`AdminDialog`).
- **Insiders signup after launch (2026-11-16):** every "find your wei" and "insiders" link (header, mobile menu, footer,
  homepage section) opens `/insiders`: SiteHeader, the same "join onwei insiders" section as the waitlist page
  (`InsidersJoinSection`), SiteFooter. No Figma frame; owner approved this basic layout. Same API, `source:
insiders_page`, consent wording without "about the launch" stored as `insiders-v1:<privacy version>`. Gated to
  `/ontheway` while the site is in waitlist mode. The collection page's "Start Quiz" button is a separate, unbuilt quiz.
- **Admin naming:** the Waitlist page is now Insiders > Members (`/waitlist` redirects). Admin copy says Insiders.
- **Consent:** the waitlist box now reads "...contacting me about the launch by email and WhatsApp...", and new entries
  store `consentVersion` as `waitlist-v2:<privacy version>`.
- **Insiders > WhatsApp sends (pushed 2026-11-17, b762ec1, prod migrated):** staff pick any approved Utility or Marketing template from Gupshup,
  choose what fills each blank (first name, full name, Insider code, address form link, the end of a button link, or
  fixed text), pick a group (all, no address yet, address shared, joined between dates, hand-picked), see counts of who
  is left out (STOP, unsubscribed, no code, already got this template, with an opt-in to send again), send a test with
  sample values, then send. The page sends in batches of 20 with a progress bar and a Stop button; every member is
  checked again on the server before their message goes. `WhatsAppCampaign` stores the template, which kind of value
  filled each blank (never the values) and who it was for; `WhatsAppMessage` gets `campaignId` and `templateName`
  (purpose `CAMPAIGN`). Logs: "Sent messages" (per send, delivered and read bar, per person with status filter) and
  "Automatic messages" (welcome and Insider code). Code in `packages/core/src/messaging/whatsapp/campaign.ts`
  (browser-safe parts in `campaignFill.ts`, imported as `@onwei/core/campaign-fill`), routes under
  `apps/admin/app/api/insiders/whatsapp/`. Migration `20261119120000_whatsapp_campaigns` (owner runs on prod before the
  push). The Insider code message is now labelled Utility in admin.
- **WhatsApp numbers panel (pushed 2026-11-18, 6cf5164):** top of "Sent messages" and "Automatic messages": sent,
  delivered (includes read), read, not delivered yet, failed, each with a %, split by message type (New message,
  welcome, Insider code), top 3 failure reasons, range 7 days, 30 days (default) or all time (`?range=`). Data from
  `getInsiderWhatsAppStats({ days })` in `campaign.ts` (date math lives in core, the React purity lint forbids
  `Date.now()` in a server component).
- **Meta rejected `onwei_insider_code` as Utility (Incorrect Category):** a message carrying a discount code is
  Marketing. Replacement proposed: `onwei_card_address_request` (Utility, no code), body "Hi {{1}}, we need your
  delivery address to send your Onwei card..." with an "Add address" URL button `https://www.onwei.in/insider/address?t={{1}}`;
  admin fill: First name, end of the address link. Owner to submit in Gupshup.
- **Sender shows as a number, not "Onwei":** WhatsApp shows the number to people who have not saved it until the
  display name is approved and Meta business verification is done; the name always shows only with Meta Verified or
  an Official Business Account. Owner to check Name status in WhatsApp Manager and verify the business.
- **WhatsApp failure reasons (2026-11-21):** `WhatsAppMessage.failureCode` (migration `20261121120000_whatsapp_failure_code`,
  backfills old rows from the reason text). `failures.ts` (browser-safe at `@onwei/core/whatsapp-failures`) maps codes to
  plain words and kinds: HELD (131049, 130472, 131050: Meta held it back, counted as "Held by Meta" not Failed, can be sent
  again), RATE_LIMIT (429, 130429, 131056: `deliverTemplate` retries twice after 1s and 3s), UNDELIVERABLE (131026: left
  out of Insiders sends for 90 days unless a later message got through, `undeliverablePhones`), TEMPLATE (132xxx).
  Admin logs and numbers show the plain line with WhatsApp's own words underneath.
- **WhatsApp page tidy-up (2026-11-18, local):** the "Choose template" popup lists only templates that are approved
  and fit the message (`templateFitFor` in `gupshupTemplates.ts`: approved, right category, sendable top part, image
  only where allowed) and says how many are still waiting. Steps: choose, check the filled-in preview (one dropdown per
  blank, count fixed by the template), image if the template has one. Template ID, name, text box and header select are
  no longer shown. Saving refuses a new or switched-on template that doesn't fit (`api/whatsapp/templates/_usable.ts`);
  an old one can always be kept switched off. On/off moved to the row (PATCH on the same route, with a confirm). A
  saved template WhatsApp later rejects shows red ("Template rejected"); working ones show On or Off but is not switched off
  automatically (owner's call). The save route now accepts all six messages (it only took three before).

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
| Contact Us                                     | 1189:6006                   | 1189:6203     | Built 2026-11-09 (`/contact`, admin Messages)                                                                         |
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

## 14a. Pre-order campaign (Phase H, approved 2026-11-18, built locally, not pushed)

Owner sheet and answers (2026-11-18):

- Three tiers, days per tier set in admin (length not fixed yet). Tier 1: 15% + mystery box worth ₹1,000; tier 2: 10% +
  box ₹500 (tote, socks, cap); tier 3: 8% + box ₹250 (cap, socks). Box contents are examples: a box is any inventory item.
- Insiders: 5% extra (use whatever Insider discount is configured) + an exclusive gift worth ₹200. Referral: later.
- Insider discount with other offers is an admin choice: "Add on top" (15% + 5% = 20%, percentages add on the original
  price) or "Bigger one wins". It applies to coupons too and replaces the per-coupon "works with Insider" tick.
- Reserve ₹900 per item now (admin setting, default 900), balance when stock is ready. Online only, no COD. Anyone can
  pre-order (sign-in needed). No cap on quantity. Pre-orders are the next step (site mode PREORDERS).
- Cancel: the paid reserve turns into a personal coupon (credit) for the customer. Cash refund is a staff-only fallback.
- Coupons get a "free item" reward (any inventory item), filter pills by type (codes, automatic, free item, personal
  credits) and "Where this works": on (whole order, categories, products), for (normal orders, pre-orders, both), who.

Design (as built):

- Admin "Coupons and discounts" (`/coupons`) with tabs Coupons, Insider discount (moved from Insiders), Pre-order, and a
  price checker. Products get a "Gift only, not sold on the site" switch (mystery boxes, Insider gift).
- Engine (`packages/core/src/pricing/engine.ts`): `insiderMode` ADD or BEST, an optional pre-order tier discount, coupon
  `FREE_ITEM` reward (free lines at ₹0, counted at their value when picking the best combination), coupon
  `appliesTo` checked against the order kind.
- Order kind PREORDER, new status RESERVED (reserve paid, waiting for stock and balance). PENDING to RESERVED on the
  reserve payment, RESERVED to CONFIRMED on the balance payment. Reserve uses `Order.razorpayOrderId`, the balance its
  own Razorpay order (`balanceRazorpayOrderId`). Tier, discounts and gifts are saved on the order at reserve time.
- Stock: reserving takes none. "Stock is in, ask for balance" (per product) holds stock for the oldest reservations
  first, plus their box and gift, and sends the balance link (email and WhatsApp). Balance paid turns the hold into a
  sale, like a normal order. Reminders after 3 and 7 days; after 14 days staff can cancel (credit coupon, stock back).
- Pre-order checkout is its own one-product flow (not the cart), so the normal cart's stock rules stay untouched.
- Owner follow-ups (2026-11-18): a credit keeps its leftover for the next order; unpaid balance gets reminders, then
  after 14 days the reserve becomes credit valid for a year (every pre-order credit lasts 12 months).

Built (2026-11-18, local, not pushed). Migrations `20261120120000_preorders_and_discounts` and
`20261120120100_preorder_whatsapp` (owner runs on prod BEFORE the push: new enum values and columns the code reads).

- Core `packages/core/src/preorders/`: `campaign.ts` (settings, tier windows, public status), `quote.ts` (price and
  reserve split), `reserve.ts` (place), `balance.ts` (ask for balance FIFO, balance payment, cancel to credit or refund,
  daily reminders, customer credits), `report.ts` (admin numbers), `checker.ts` (admin price checker), `notify.ts`
  (email + WhatsApp), `rateLimit.ts`. Payments: `markOrderPaid` handles reserve (PENDING to RESERVED) and balance
  (RESERVED to CONFIRMED) through `paymentTarget`. Manual status changes never move RESERVED orders.
- Normal cart: refuses gift-only products and everything while the site is in PREORDERS mode; free item coupons add
  ₹0 lines held from stock (left out if out of stock). Credits (`Coupon.kind CREDIT`) go with every offer.
- Admin: `/coupons` "Coupons and discounts" with tabs Coupons (type pills, "Where this works"), Insider discount (moved
  from Insiders, `?tab=discount` redirects; add on top / bigger one wins), Pre-order (campaign form, numbers, "Stock is
  in, ask for balance" per product), Price checker. Orders list filter by kind; order page pre-order panel with cancel
  to credit (or refund with `order:refund`). Products have "Gift only". WhatsApp templates: PREORDER_RESERVED,
  PREORDER_BALANCE, PREORDER_CREDIT (off until set up in admin WhatsApp).
- Storefront: banner (Figma 1257:7003) under the header, pinned; pop-up (1257:5853 desktop, 1257:6666 mobile sheet) once
  per visit instead of the sign-in pop-up; "Reserve for ₹900" on product page and cards; `/preorder/checkout`
  (checkout style, no Figma); success page and account order page (pay balance, cancel to credit); account "My
  credits". Daily cron (`/api/cron/release-orders`) sends reminders and makes credits.
- Figma copy typos fixed: "and and" to "and", "wont" to "won't". The pre-order marquee (Design page 1233:3238) is not on
  Dev Ready and was not built. Lap names, percentages and gift names come from admin, so the site shows 15/10/8%.
- Gifts: the tier's mystery box is one per item; the Insider gift is one per pre-order.
- **Pre-order journey table (2026-11-19, local):** admin Pre-order tab shows tiers like the owner's sheet: tier and
  dates, days, discount, mystery box (with its worth, the gift product's price), and "Insiders get" worked out from the
  Insider discount tab (`insiderExtraText`, browser-safe at `@onwei/core/preorder-text`). Insider gift sits under the
  table with its worth. "What a customer pays" prices one product per tier for everyone and Insiders, delivery, paid
  now and balance (`previewPreorderJourney`, same engine as checkout, uses the unsaved form; `POST /api/preorders/preview`).
  The Insider extra stays on the Insider discount tab (owner, 2026-11-19). Referral gifts are a separate program for
  anyone, built later, not tied to pre-orders. No schema change.
- Pre-order mode on the normal bag (fix 2026-11-18, after the owner reached the normal checkout at full price): in
  PREORDERS mode `getCartView` returns `preorderOnly` and `canCheckout: false`, each line says if it is `reservable`.
  The bag drawer shows "Reserve this" per pre-order item and a note instead of Checkout; `/checkout` shows "Pre-orders
  are on" with Reserve links; `placeOrder` refuses with `PREORDER_ONLY` (own message, not "Your bag is empty").
  Products not in the campaign show a disabled "Available at launch" on the product page and cards.

Clean switch between pre-orders and the normal shop (audit and fix 2026-11-18, after the owner saw "This item isn't
available right now" on an item with 121 in stock):

- Cause: the browser and the server used two different rules. The server shut the bag whenever the site mode was
  PREORDERS. The browser only treated the site as pre-order when a campaign lap was also running. Dev was in PREORDERS
  with no campaign, so the site showed "Add to cart" and the server refused it with a generic message.
- One rule now: `getStorefront()` / `storefrontStateOf()` in `packages/core/src/preorders/storefront.ts` returns LIVE,
  WAITLIST, PREORDER_OPEN (a lap runs), PREORDER_SOON (starts later) or PREORDER_CLOSED (no campaign, or it ended). The
  cart, quick add, the pre-order quote (refused unless PREORDER_OPEN, so the reserve link is dead while the site is
  live), `/api/preorder/status` (new `state` and `opensAt`) and the buttons (`buyModeFor`) all read it.
- Bag in pre-order mode: add, quick add and + refuse with `PREORDER_ONLY` ("We're only taking pre-orders right now. The
  bag opens at launch."). `getCartView` shows no lines, the drawer shows "Pre-orders are on" with a link to Shop All, and
  `/checkout` says checkout opens at launch. The per-line "Reserve this" was removed.
- Owner decisions: switching the site INTO pre-order mode empties every bag and its typed codes (`emptyAllCarts`, inside
  the `updateSiteSetting` transaction, line count in the audit log). Admin refuses the switch unless a campaign is
  switched on and not over (`canStartPreorderMode`).
- Owner decision: lists show only campaign products in pre-order mode (`storefrontProductWhere` in featured, category,
  Shop All, related and compare lists). Categories with nothing on pre-order are hidden from the header, mobile menu,
  footer, collection tabs and homepage tabs (`listHiddenCategorySlugs`, `lib/hiddenCategories.ts`); their collection
  page redirects to Shop All. A product page stays reachable by its link and shows "Available at launch".
- Buttons stay disabled until the status loads. Campaign products show "Pre-orders open <date>" before the start and
  "Pre-orders closed" after the end. Saving a campaign or the site mode refreshes the catalog cache and product pages.
- Going LIVE after pre-orders: lists, menus and the bag return to normal on the next refresh. Reserved orders still
  pay their balance through their own link (balance payments don't depend on the site mode).
- Core integration tests now run one file at a time when a database is connected (`packages/core/vitest.config.ts`):
  the commerce and pre-order files switch the shared site mode and broke each other in parallel.

Problems hit while building (and the fix):

- Typecheck breaks after adding `insiderMode`, RESERVED and removing `combinableWithInsider`: every caller updated.
- Circular import cart.ts / orders.ts over `variantLabelOf`: moved to `commerce/variantLabel.ts`.
- Lint: no `Date.now()` in render (use `useNow`), no mutable variable inside `useMemo` (rewrote with reduce).
- Integration test called real Razorpay: vitest restores mocks after each test, so the Razorpay stub must be set in
  `beforeEach`, not `beforeAll`.
- Dev server threw `preorderCampaign` undefined after the migration: stale Prisma client in the running server.
  Run `prisma generate` and restart `npm run dev` after any schema change.
- Pop-up live lap card narrower than the others (flex plus padding): use `grid grid-flow-col auto-cols-[minmax(0,1fr)]`.
- White strip around the pinned banner: wrap it in a sticky `bg-onwei-green py-2` div.
- Mobile pop-up "Locked" pill overflowed: header row wraps on mobile.
- Commerce integration tests failed because the dev DB was in PREORDERS mode and COD was off in dev Settings: the test
  now switches site mode to LIVE and COD on in `beforeAll` and restores both after. Slow dev DB hooks: 60s timeouts.
- Normal checkout reachable in pre-order mode, showing the full price and "Your bag is empty": fixed as above.
- In dev, WhatsApp sign-in codes are not really sent: no SIGN_IN_CODE template row in the dev DB and
  `MSG91_OTP_TEMPLATE_ID` is empty, so the static `OTP_STATIC_CODE` is used.
- Still failing, unrelated and untouched: admin `app/page.test.tsx` (cookies outside a request) and web
  `app/about/page.test.tsx` (async SiteFooter).

Before pushing: owner runs both migrations on prod; then push only on "commit and push". Owner to-dos for the launch of
pre-orders: create the campaign and gift-only products in admin, submit the three pre-order WhatsApp templates
(Utility), set site mode to PREORDERS. Optional: relabel the "Total" line on the reserve checkout; the pre-order
marquee is not built.

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
4. (Answered 2026-11-18, see section 14a. Pre-orders built locally.)
5. Razorpay: test keys in `.env.local`, account activation status.
6. Go-ahead to start Phase A.

## 19. Delivery partner: iThink Logistics (approved 2026-11-24)

The owner picked iThink Logistics (https://docs.ithinklogistics.com/, API v3). Two phases: Insider cards first
(built locally 2026-11-24, not pushed), then orders.

**Decisions:** Add Order (books the courier and returns the tracking number at once), not Sync Order. Labels are
printed in the iThink portal, not in Onwei admin. iThink picks the courier (`logistics` empty). No polling for now:
staff press "Update all" (webhooks are not in iThink's docs; ClickPost lists them, so ask the account manager).
Weight is always kg, dates go as `dd-mm-yyyy` (India time). Card envelope: 20.3 x 15.2 x 1 cm, 26 g, declared value
₹1, editable in Insiders > Ship cards.

**Keys (web and admin):** `ITHINK_ENV` (`staging` or `production`), `ITHINK_ACCESS_TOKEN`, `ITHINK_SECRET_KEY`,
`ITHINK_PICKUP_ADDRESS_ID`, optional `ITHINK_RETURN_ADDRESS_ID` (defaults to the pickup id) and `ITHINK_STORE_ID`.
Without all four required values admin says "iThink isn't connected yet". Phase 1 needs them on the admin project only.

**API quirks found on the test server (2026-11-24), not in the docs:**

- Add Order refuses a request missing any optional field ("Invalid Request Format - gst_number"), so every field is
  sent, empty or "0". `logistics` must be present.
- The reference comes back lowercased in `refnum`; `waybill` is a number.
- A reference iThink has seen is refused ("Duplicate Order no. in system"), so a parcel is never booked twice. When a
  reply is lost, sending the same reference again and then reading Order Details for that day finds the booking.
- Order Details ignores `order_no`; we match the reference ourselves.
- The test server is one account shared by many shops, and its Track Order and Cancel return canned sample data.
  Test mode reads status from Order Details (`latest_courier_status`) instead, and test references get a random tail.

**Phase 1, Insider cards (`packages/core/src/logistics`, admin Insiders > Ship cards):**

- `Shipment` table, one row per parcel attempt (`reference` unique, `isCurrent` marks the newest), linked to
  `InsiderCardAddress`. No copy of the address. Statuses: SENDING, BOOKED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED,
  RETURNING, RETURNED, LOST, CANCELLED, FAILED. Envelope settings on `InsiderSetting`. Migration
  `20261124120000_insider_card_shipments` (additive).
- Lists: Ready to send (address, printed card, not posted, nothing active), Sent, Needs a look (refused, coming back,
  lost, address changed after booking, no reply for 5 minutes), No card yet.
- Send selected or "Send all", 10 per request. References `CARD-0042`, then `CARD-0042-2` for a resend.
- "Update all": 50 per request, each card asked once per press. Courier updates only move forward (or to returning,
  lost, cancelled before pickup). Picked up sets `InsiderCardAddress.postedAt`, which the member's address page shows.
- Cancel booking (only before pickup), Keep as is (address changed), Posted by hand (blocked while iThink has the
  card). The old CSV download and "Mark posted" button are gone; `?tab=addresses` redirects to `?tab=ship`.
- Audit rows: send, cancel, keep, envelope change, posted by hand. Courier status changes are not audited.
- Tests: `ithinkClient.test.ts`, `shipmentStatus.test.ts`, `cardShipments.integration.test.ts` (fake iThink).

**Launch for phase 1:** migrate prod (`20261124120000_insider_card_shipments`) before the push, add the live iThink
keys to the admin Vercel project with `ITHINK_ENV=production`, push, send 3 or 4 cards, check them in the portal.

**Phase 1 status:** pushed 2026-11-24 (0b9c350), prod migrated, live keys on both Vercel projects.

**Phase 2, orders (built locally 2026-11-25, not pushed):**

- Sending: `afterOrderConfirmed` (web `api/_lib/orderEmails.ts`) sends every newly confirmed order to iThink after the
  response (COD placement, payment verify, Razorpay webhook; a pre-order once its balance is paid). Reference is the order
  number (`ONW1001`, then `ONW1001-2`). A failed send stays on the order: admin order page "Delivery (iThink)" card with
  Send to iThink, Check again (no reply), Get latest update.
- Parcel: items at their price, free items at ₹1 (iThink refuses ₹0) balanced in `total_discount`, delivery fee and COD
  fee as charges, `cod_amount` is the total minus online payments.
- Parcel size and weight (owner, 2026-11-24): every category has one cardboard shipper box (`Category.box*`: length,
  width, height in cm, empty weight in grams; admin Categories). Each unit in an order gets its own box, stacked: length
  and width are the largest box, height is every box height added (times quantity), weight is each unit's variant weight
  plus its empty box. A category with no box or a size with no weight uses the backup numbers in admin Settings > Delivery,
  payment and returns (`StoreSetting.parcel*`, `defaultItemWeightKg`), and the admin order page warns that the size was
  estimated. Nothing is blocked when they're missing (owner, 2026-11-24): products go live and sizes save without them,
  the product page shows what's missing, and admin Products shows "Missing delivery details" with a filter. Migration
  `20261126120000_category_shipper_box`. Tentative boxes from the owner: Pickleball 15 x 9 x 4 in, Yoga 37 x 17 x 14 in.
- Updates: "Get latest update" on an order, "Update N open shipments from iThink" on the Orders list (50 per request).
  Picked up moves the order to Shipped (tracking number and courier filled in), then Out for delivery, Delivered (with
  iThink's delivery date, which starts the return window). Skipped steps are walked one history row each
  (`changedBy = "ithink"`); the state machine now allows CONFIRMED > SHIPPED and SHIPPED > DELIVERED. Returning, returned,
  lost or cancelled in the portal set `needsAttention`. Shipped and delivered emails go from admin after the update
  (`renderOrderShippedEmail`, `renderOrderDeliveredEmail`).
- Cancel: staff cancel cancels the iThink booking first; if iThink refuses (picked up) the order stays.
- PIN check: `/api/checkout/pincode` (30 per 10 minutes per IP, 6-hour cache) when moving to payment: "We can't deliver to
  this PIN code yet" or cash on delivery greyed out ("isn't available at this PIN code"). `placeOrder` and pre-order
  reserve check again (`PIN_NOT_SERVICEABLE`, `COD_NOT_AVAILABLE_HERE`). iThink not answering never blocks a sale.
- Customer order page links the tracking number to iThink's tracking page.
- The "Ship it by hand" form stays for orders sent without iThink and hides while iThink has the parcel.
- Migrations `20261125120000_order_shipments` (additive: `ShipmentKind.ORDER`, `Shipment.orderId`, `StoreSetting` parcel
  columns) and `20261126120000_category_shipper_box` (additive `Category.box*`). `StoreSetting` is read on every cart view
  and categories on every catalog page, so prod must be migrated before the push.
- Not done: the customer order page doesn't refresh tracking by itself (button-only, as decided). Later: polling or
  webhooks, return pickups, COD remittance, failed-delivery reattempt.
