# Email plan (recommended 2026-09-30, not started)

Status: **parked, no decisions approved yet.** Come back to this before building anything email related.
Scope: email only. Mobile number verification is out of scope for now (phone stays an optional,
unverified field). Orders, delivery partner and CRM are also not started, so delivery-update emails wait.

## Today

- `OtpSender` interface with only `ConsoleOtpSender` (logs the code, sends nothing).
- `packages/emails` has one OTP template (`renderOtpEmail`), unused. Expiry is hardcoded to 10 minutes.
- Tables: `NewsletterSubscriber`, `WaitlistEntry`, `ConsentLog`. Nothing records sent mail, bounces or
  unsubscribes.
- Customer login still offers an SMS channel.

## Design

1. **Two streams, never mixed.**
   - Transactional: OTP, order confirmation, delivery updates, return and refund updates.
   - Marketing: offers and campaigns. Needs recorded consent (`ConsentLog`, DPDP) and a working
     unsubscribe that takes effect immediately.
   - Separate sender addresses (for example `orders@` and `hello@`), on separate subdomains if the provider
     allows, so a marketing spam complaint cannot hurt OTP delivery.
2. **Provider behind an `EmailSender` interface** in `packages/core` (one adapter per vendor, same rule as
   `PaymentProvider`). Recommendation: Amazon SES in Mumbai (`ap-south-1`). Alternatives: Resend (fastest
   to ship), Brevo (built-in campaigns), Postmark (best transactional, no marketing stream).
3. **Domain authentication first:** SPF, DKIM, DMARC (start in monitor mode) on the sending domain.
   Required for inbox delivery, and Gmail and Yahoo reject bulk senders without it.
4. **Send pipeline.**
   - `EmailMessage` table: type, recipient, status (`queued`, `sent`, `delivered`, `bounced`, `complained`,
     `failed`), provider message id, unique idempotency key (for example `order-123-shipped`).
   - Business code queues mail, a worker sends with retries. OTP is the exception and sends inline.
   - Signature-verified webhook for bounces and complaints.
   - Suppression list: hard bounces and complaints are blocked automatically on both streams.
5. **Templates** in `packages/emails` with one shared layout, HTML plus plain text, expiry as a parameter,
   and an admin preview route.
6. **Offers and campaigns (later):** audience of opted-in customers, compose, test send, schedule, batch
   send, basic stats, signed unsubscribe link plus `List-Unsubscribe` header. Start with template-based
   offers staff trigger with a chosen coupon, or use Brevo instead of building an editor.
7. **Delivery updates:** build templates and the queue now, send them once the order flow exists.

## Suggested order

1. Domain authentication, `EmailSender` interface, provider adapter.
2. Wire OTP to real email and make login email-only (hide SMS, keep phone as optional stored field).
3. `EmailMessage`, suppression list, bounce and complaint webhook (schema change, needs a plan and the
   db-migrations workflow).
4. Marketing consent and unsubscribe flow (`ConsentLog`, `NewsletterSubscriber`).
5. Template set and admin preview.
6. Offers and campaigns.

Steps 1 to 3 are the first plan to write once decisions are in.

## Questions still open

1. Provider: SES, Resend, Brevo or Postmark? Existing account or preference?
2. Sending domain: does the business own `onwei.in`, and who can add DNS records?
3. Expected volume in year one (emails per month)?
4. Offers: staff-composed campaigns, automated event emails (abandoned cart, birthday, win-back), or both?
5. Login email-only, removing SMS from the login page entirely?
6. Are existing newsletter subscribers and waitlist entries consented for marketing, or does waitlist
   consent cover only the launch notice? This decides who can receive offers.
7. Open and click tracking wanted? (Helps campaigns, costs privacy and some deliverability.)
8. English only? Is there a footer with a postal address for compliance?
