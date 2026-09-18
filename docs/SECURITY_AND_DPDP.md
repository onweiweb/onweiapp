# Security & DPDP notes

This is a technical implementation of common privacy-by-design practices, not
a legal compliance certification. It isn't legal advice — for anything that
determines actual regulatory exposure, get sign-off from counsel.

## Where the DPDP Act actually stands (as of this writing)

The Digital Personal Data Protection Rules, 2025 were notified in mid-November
2025, and enforcement is staggered in three phases: the Data Protection Board
itself became operational immediately; the Consent Manager framework phases
in from mid-November 2026; and the substantive obligations that matter most
for a storefront — notice and consent, the full set of data-principal
rights, breach notification, and Significant Data Fiduciary duties — become
enforceable from **13 May 2027**. Multiple legal trackers describe 2026 as
the "build and test" year rather than the enforcement year.

That doesn't mean it's safe to defer. The obligations are the same either
way, and retrofitting consent capture and data-subject-rights tooling into a
live storefront is much more painful than building them in from the start —
so this plan treats them as Phase 1 requirements, not a later add-on.

## Encryption

- **In transit:** HTTPS everywhere, HSTS. No exceptions for internal admin
  traffic either.
- **At rest:** rely on the managed Postgres provider's disk-level encryption
  as the baseline. `phone` and `email` on `Customer` are candidates for
  application-level encryption (not just hashing, since they need to be
  readable for order fulfillment and support) — a concrete call on this is
  one of the open decisions, since it affects how search/lookup by phone or
  email works.
- **OTP codes:** always stored hashed (`OtpChallenge.codeHash`), never in
  plaintext, with a short expiry.
- **Payment data:** the app never stores card numbers — only the payment
  provider's transaction reference (`Payment.providerPaymentId`). Card data
  stays entirely with the payment gateway (PCI scope reduction, and it also
  keeps this out of DPDP's personal-data surface for that specific field).

## Consent

- `ConsentLog` records what policy version a customer accepted and when, at
  signup and whenever the policy changes materially — this is the
  demonstrable-consent record DPDP requires.
- Marketing communications get their own consent type (`MARKETING`),
  separate from the Terms/Privacy acceptance needed to use the site at all.
  Opting out of marketing must not block checkout.

## Data-subject rights

`DataSubjectRequest` tracks access, correction, and erasure requests. For
Phase 1, handling these through the admin CMS (a staff member fulfills the
request and marks it resolved) is enough; a self-serve customer-facing flow
can come later once volume justifies it.

## Data minimization

- Collect phone + email because the brief requires both for a purchase — but
  nothing beyond what's actually used (no unnecessary demographic fields,
  no "optional" fields that quietly become mandatory in practice).
- `AnalyticsEvent.customerId` is nullable — funnel events don't need to be
  tied to an identity to be useful in aggregate.

## Third-party data flows

Every external processor (payment gateway, SMS/email OTP provider, any
reviews-aggregation service) is a place personal data leaves the app. Each
one needs: a data-processing agreement, a clear list of what's shared with
it, and — if it's a non-Indian provider — a look at where it processes and
stores that data, since cross-border transfer rules are part of what the
DPDP Rules define. This is one more reason the provider choice in
`docs/OPEN_DECISIONS.md` isn't a purely technical decision.
