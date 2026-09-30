@AGENTS.md

## Admin conventions (added 2026-09-30)

- Lists that grow with data (orders, customers, newsletter, reviews, audit log, products) page with
  `_lib/pagination.ts` (`parsePage`, `pageWindow`, `trimPage`) and `_components/ui/AdminPager`. Add an
  `id` tiebreaker to `orderBy`. Do not add a bare `take: N` cap, it hides older rows.
- New lists that can grow must page the same way. Small config tables (roles, categories, content
  editors) may stay unpaged.
- Staff login is rate limited through `checkStaffLoginRateLimit` in `@onwei/core`. Any new public
  admin endpoint that takes credentials should reuse `createLazyLimiter`.
- Every API route is built with `app/api/_lib/defineAdminRoute.ts`: `defineAdminRoute({ permission, body:
schema }, handler)` does the session and permission check, reads and validates the JSON body (zod), and
  hands the handler `{ staff, body, params, request }`. Shared schema pieces live in `app/api/_lib/schemas.ts`.
  Do not hand-parse `request.json()` in a route. Only login and logout are outside it (they have no staff
  session).
- Schema messages are what staff see, so write them in plain language (see the cms-plain-language skill).
  Zod 4 gotcha: a key built on `z.unknown()` is required unless you add `.optional()` first (see `optionalDate`).
- Links that get rendered as `<a href>` on the storefront (social links) must be validated as http(s)
  URLs, never stored as free text.
- No em dashes anywhere (code, comments, UI copy, docs).
