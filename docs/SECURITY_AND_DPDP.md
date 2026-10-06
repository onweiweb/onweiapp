# Security & DPDP notes

This is a technical implementation of common privacy-by-design practices, not
a legal compliance certification. It isn't legal advice, for anything that
determines actual regulatory exposure, get sign-off from counsel.

## Where the DPDP Act actually stands (as of this writing)

The Digital Personal Data Protection Rules, 2025 were notified in mid-November
2025, and enforcement is staggered in three phases: the Data Protection Board
itself became operational immediately; the Consent Manager framework phases
in from mid-November 2026; and the substantive obligations that matter most
for a storefront, notice and consent, the full set of data-principal
rights, breach notification, and Significant Data Fiduciary duties, become
enforceable from **13 May 2027**. Multiple legal trackers describe 2026 as
the "build and test" year rather than the enforcement year.

That doesn't mean it's safe to defer. The obligations are the same either
way, and retrofitting consent capture and data-subject-rights tooling into a
live storefront is much more painful than building them in from the start,
so this plan treats them as Phase 1 requirements, not a later add-on.

## Encryption

- **In transit:** HTTPS everywhere, HSTS. No exceptions for internal admin
  traffic either.
- **At rest:** rely on the managed Postgres provider's disk-level encryption
  as the baseline. `phone` and `email` on `Customer` are candidates for
  application-level encryption (not just hashing, since they need to be
  readable for order fulfillment and support), a concrete call on this is
  one of the open decisions, since it affects how search/lookup by phone or
  email works.
- **OTP codes:** always stored hashed (`OtpChallenge.codeHash`), never in
  plaintext, with a short expiry.
- **Payment data:** the app never stores card numbers, only the payment
  provider's transaction reference (`Payment.providerPaymentId`). Card data
  stays entirely with the payment gateway (PCI scope reduction, and it also
  keeps this out of DPDP's personal-data surface for that specific field).

## Consent

- `ConsentLog` records what policy version a customer accepted and when, at
  signup and whenever the policy changes materially, this is the
  demonstrable-consent record DPDP requires.
- Public forms use an unticked, required checkbox (`apps/web/app/_components/ConsentCheckbox.tsx`).
  A "by submitting you agree" line is not valid consent under DPDP or GDPR. The API routes
  reject a missing flag with `CONSENT_REQUIRED`, so the checkbox cannot be bypassed.
  - Waitlist: stores `WaitlistEntry.consentVersion` and `ipAddress`.
  - Newsletter: stores `NewsletterSubscriber.consentVersion`, `consentedAt`, `ipAddress`. Rows
    from before 2026-10-02 and staff-added rows have no proof of consent.
  - Login: writes `ConsentLog` rows (`TERMS_OF_SERVICE`, `PRIVACY_POLICY`) when the customer
    is created.
  - The version string is the latest `LegalPage.updatedAt` (ISO) of the pages shown
    (`getCurrentConsentVersion` in `packages/core/src/legal/consentVersion.ts`).
- Open: no unsubscribe link or withdrawal flow exists yet in any email or page. Needed before
  the first marketing email is sent (the welcome emails are transactional).
- Marketing communications get their own consent type (`MARKETING`),
  separate from the Terms/Privacy acceptance needed to use the site at all.
  Opting out of marketing must not block checkout.

## Data-subject rights

`DataSubjectRequest` tracks access, correction, and erasure requests. For
Phase 1, handling these through the admin CMS (a staff member fulfills the
request and marks it resolved) is enough; a self-serve customer-facing flow
can come later once volume justifies it.

## Data minimization

- Collect phone + email because the brief requires both for a purchase, but
  nothing beyond what's actually used (no unnecessary demographic fields,
  no "optional" fields that quietly become mandatory in practice).
- `AnalyticsEvent.customerId` is nullable, funnel events don't need to be
  tied to an identity to be useful in aggregate.

## Third-party data flows

Every external processor (payment gateway, SMS/email OTP provider, any
reviews-aggregation service) is a place personal data leaves the app. Each
one needs: a data-processing agreement, a clear list of what's shared with
it, and, if it's a non-Indian provider, a look at where it processes and
stores that data, since cross-border transfer rules are part of what the
DPDP Rules define. This is one more reason the provider choice in
`docs/OPEN_DECISIONS.md` isn't a purely technical decision.

## Visitor analytics (PostHog)

The storefront sends page and form events to PostHog Cloud (through our own
`/ingest` path, see `apps/web/next.config.ts`).

- **No cookie, no banner.** PostHog runs cookieless: visitors are counted with
  a daily-rotating hash, and nothing is stored on the device except a random
  per-tab visit id and the first-touch UTM values in `sessionStorage`, which
  disappear when the tab closes. Revisit this with the client's DPDP advisor
  before launch, and add a consent banner if they want one.
- **What is sent:** page views, scroll depth, time to first interaction,
  field names and error codes on forms, UTM values and the referrer host,
  plus what PostHog itself derives (device type, approximate city and
  country from the IP address). **Never** what someone typed (name, email,
  phone).
- **What we store ourselves:** on `WaitlistEntry`, the UTM values, referrer
  host, and approximate country, region and city from the host's IP headers.
  These are personal data tied to a signup, so they follow the same
  retention and deletion as the rest of the row.
- **Residency:** PostHog Cloud runs in the US or EU, not India. Pick the
  region deliberately and confirm it is acceptable to the client.
- **Keys:** the public project key is safe in the browser. The access key used
  by the admin dashboard to read data is a secret (server-only env var).
