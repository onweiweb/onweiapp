@AGENTS.md

## API route conventions (added 2026-09-30)

- Validate every request body with zod through `parseJsonBody(request, schema)` from `@onwei/core`
  (64 KB cap, must be a JSON object). Schemas check shape only; business rules stay in `packages/core`.
- Failures answer `{ ok: false, reason }` with a machine-readable reason the UI maps to copy. Use
  `apps/web/app/api/_lib/invalidInput.ts` for a bad or missing body.
- Public write endpoints need a rate limit (`createLazyLimiter`; waitlist, newsletter and OTP have one)
  and read the caller IP with `getClientIp`.
- Secrets are compared in constant time (`timingSafeEqual`, see `api/revalidate/route.ts`).
- No em dashes anywhere.
