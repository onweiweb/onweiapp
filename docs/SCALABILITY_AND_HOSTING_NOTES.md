# Scalability and hosting notes (for Phase 2 planning)

Written 2026-09-30 from a discussion. Numbers are rough estimates, not load tested.
Verify current Vercel/Neon/AWS pricing before acting on any cost figure.

## Decision

Stay on Vercel. No AWS/GCP move needed now. Expected first-year load is about 20k users per
month, which is far below any ceiling. Revisit hosting only if a trigger below fires.

## Current state (audited 2026-09-30)

- Projects `onweiapp` (apps/web) and `onweiapp-admin` (apps/admin): Next.js, Node 24, fluid compute on.
- **Function region is `iad1` (US East) on both. Users and DB are likely in India. Needs fixing (see actions).**
- DB: Neon via Vercel Postgres. Runtime uses pooled `DATABASE_URL` (PgBouncer) with `@prisma/adapter-pg`, `max: 5` per instance. Migrations use `DIRECT_URL`. Pooling is correct.
- DB region: not readable (env vars are sensitive). Check in Neon console. Also check scale-to-zero setting.
- Storefront: catalog reads go through `unstable_cache` (`apps/web/lib/cachedCatalog.ts`, 60s, plus on-demand revalidate from admin). Good. Only robots, sitemap, waitlist, about set `revalidate` explicitly.
- Env gap: neither Vercel project lists `UPSTASH_REDIS_REST_URL/TOKEN` or `RATE_LIMIT_ALLOW_UNCONFIGURED`. Per `.env.example`, staff login and OTP refuse to run in production without them. Verify login works in prod, or the vars live somewhere not listed.
- Root `.env` holds `VERCEL_TOKEN` only.

## Capacity (rough)

| Layer                   | Ceiling                                                |
| ----------------------- | ------------------------------------------------------ |
| Static/ISR/CDN pages    | 50k+ concurrent browsers                               |
| Vercel functions        | ~30k concurrent executions on Pro, not the bottleneck  |
| Dynamic API, untuned DB | ~500 to 2,000 concurrent active users                  |
| Dynamic API, tuned DB   | ~5k to 15k                                             |
| Orders                  | ~20 to 50/sec sustained, ~20 to 100/sec on one hot SKU |

20k users/month is roughly 700 a day, single digit concurrent on average. A sale or viral spike
might reach 100 to 500 concurrent. All comfortable.

The real limit is Postgres (connections, CPU, hot-row locks), not Next.js or Vercel.

## DB in plain words

- The website is the waiter. Postgres is the kitchen. Vercel can add unlimited waiters instantly.
  The kitchen is one fixed size. A rush of waiters just makes a long queue at the kitchen.
- Every page that reads products or stock asks the kitchen. Caching means most pages are served
  from a shelf near the customer and never reach the kitchen.
- PgBouncer is a host at the kitchen door. It lets thousands of waiters share a small number of
  cooks instead of each grabbing their own. Already set up.
- Hot SKU problem: 500 people buying the last 20 units all touch the same stock row. Extra servers
  do not help. Needs compare-and-set or row lock in a transaction (already a repo convention).
- Scale-to-zero: the kitchen sleeps when idle and takes 0.5 to 3 s to wake. Turn it off in prod.
- When the kitchen is full: raise the DB tier, add indexes, cache more, move non-urgent writes to a queue.

## Speed

Speed risks are configuration, not Vercel.

1. Function region vs DB region mismatch (current issue, adds 150 to 250 ms per query).
2. DB cold start from scale-to-zero.
3. Connection exhaustion (handled by pooling).
4. Dynamic pages that should be static.
5. Image weight (tune `sizes`, formats, cache TTL, eager only in scroll rows).
6. Third-party calls in request path (SMS, Razorpay, Upstash).

Targets once tuned: CDN hit 50 to 150 ms, dynamic API 100 to 300 ms, checkout write 200 to 500 ms.

## Autoscale

- Vercel autoscales compute and CDN automatically. It does not autoscale the DB (Neon can scale
  compute within a min/max you set, plan-capped).
- Autoscaled compute can flood the DB with connections. Keep pooling.
- Pay-per-use means a bot or viral spike raises the bill. Set spend cap and budget alerts.
- Needed for: sale launches, viral reels, WhatsApp/email blasts, ad campaigns. Not needed for admin.
- Serverless reacts in seconds. Container hosts (Fargate) take 1 to 3 minutes, too slow for a
  30-second spike. Point in Vercel's favor.

## Cost (rough monthly USD)

| Scale       | Vercel + Neon/Upstash/Blob | AWS        | AWS + Cloudflare CDN |
| ----------- | -------------------------- | ---------- | -------------------- |
| 50k visits  | 40 to 80                   | 250 to 400 | 200 to 350           |
| 500k visits | 250 to 600                 | 400 to 700 | 350 to 600           |
| 5M visits   | 3k to 8k                   | 1.5k to 3k | 1k to 2k             |

- AWS has a fixed floor of ~$200+ and hidden ops cost (~$500 to 2,000/month engineer time).
- CloudFront India egress is not much cheaper than Vercel overage. Big savings need Cloudflare or commits.
- Break-even to consider moving: Vercel bill steady above ~$2 to 3k/month.

## Move triggers (any one)

- Steady Vercel bill above ~$2 to 3k/month.
- Need private networking/VPC to DB or a compliance requirement.
- Long-running jobs outgrow queue tooling.
- AWS Activate / GCP startup credits make it effectively free.
- A dedicated devops person exists.

Traffic alone is not a trigger.

## Portability

Already portable: Postgres + Prisma, Upstash Redis, Turborepo, standard Next.

Lock-in points to isolate: Vercel Blob (wrap behind a storage interface), Vercel Cron,
revalidate hooks, Analytics, edge middleware (`apps/web/proxy.ts`), image loader, ISR cache
(self-hosting multiple instances needs a shared `cacheHandler`).

Move effort: ~1 to 2 weeks for Cloud Run/ECS (Docker, `output: standalone`), OpenNext/SST on
Lambda, or Cloudflare. DB move is days via `pg_dump`, or keep Neon and move only compute.

## Phase 2 implications

- Payments: Razorpay hosts the payment. We create the order and receive the webhook. Webhook
  handler must be idempotent and fast, and hand off work to a queue.
- Background work (payment webhooks, GST invoice PDFs, delivery partner sync, CRM, emails) does
  not fit serverless request/response. Pick a queue or workflow tool in the Phase 2 plan
  (Upstash QStash, Inngest, Vercel Workflow). No new host needed.
- Inventory decrement and order state changes: transaction with compare-and-set, history and
  audit rows in the same transaction (already a standing convention).
- Keep SMS/OTP, Razorpay and Redis calls off the render path.
- Put any new storage behind an interface so Blob/S3/R2 stays swappable.
- Add a waiting room or queue if a launch could exceed DB capacity.

## Action status (2026-09-30)

Done:

1. Function region set to `bom1` on both Vercel projects (project setting, API). Takes effect on the next deploy.
2. Speed Insights: `@vercel/speed-insights` added to apps/web, `<SpeedInsights />` in the root layout. Project-side Speed Insights was already on. Takes effect on next deploy.
3. Load test script: `scripts/loadtest/storefront.k6.js` (read-only routes). Not run yet. Run against a preview URL, not production.
4. Storage interface: `apps/admin/app/_lib/storage.ts` (`uploadPublicFile`), used by the product image route, with a unit test.
5. Queue tech: decide inside the Phase 2 plan. Recommendation: Inngest or Upstash QStash for webhooks, invoices, emails, delivery sync (no new host needed).

Not done, needs you: 2. Neon region and scale-to-zero: DB env vars are hidden, and no Neon API key is available. Check Neon console. Want region near Mumbai and scale-to-zero off in prod. 3. Upstash: not listed in either project's env vars. Admin login probe returned a normal 401, so login is not refused, but rate limiting may be off. Confirm vars in Vercel, add if missing. 4. Vercel spend cap and budget alerts: dashboard only (Team Settings, Billing, Spend Management).
5b. Lighthouse from India: run from a browser in India or WebPageTest (Mumbai) after the next deploy.

Nothing is committed or pushed yet.

## Fonts (licensing, re-audited 2026-10-02)

Live on onwei.in (verified from the served CSS): Author, Space Mono, Raleway, Summer Mood.

| Font                         | Used for                              | Licence                                                   | Commercial use                                                                                                                        |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Author (Fontshare, ITF)      | Headlines (`--font-display`)          | ITF Free Font License                                     | Yes, incl. web. Cannot resell or redistribute the files. Font metadata asks for an ITF credit line in design credits (not added yet). |
| Space Mono (Google Fonts)    | Nav, body, labels (`--font-grotesk`)  | SIL OFL                                                   | Yes, free. Designer-approved replacement for ABC Monument Grotesk Mono. Only Regular and Bold exist, so Medium renders as Regular.    |
| Summer Mood (Dmitry Mashkin) | Handwritten accents (`--font-script`) | Licensed by the client (confirmed by the user 2026-10-02) | Yes. Keep the licence receipt with the client.                                                                                        |
| Raleway (Google Fonts)       | CTA buttons (`--font-cta`)            | SIL OFL                                                   | Yes, free.                                                                                                                            |

ABC Monument Grotesk Mono trial files sit untracked in the root `Fonts/` folder. They are not used
in code and must never be committed or shipped.
