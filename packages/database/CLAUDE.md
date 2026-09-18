# CLAUDE.md: packages/database

Scoped rules for this package only. Read the root `CLAUDE.md` first — this
file adds detail specific to the Prisma schema and client, it doesn't repeat
the project-wide ground rules.

## This is the only place that talks to Postgres

Per `docs/ARCHITECTURE.md`: no other package or app queries the database
directly. If code outside `packages/database` needs a new query, add it here
(or in `packages/core`, which imports this package) rather than reaching for
a Prisma client instance anywhere else.

## Every schema change

1. Plan Mode first (root ground rule 1) — a schema change always needs an
   approved plan before editing `schema.prisma`.
2. Generate the migration with `prisma migrate dev --name <description>`.
   Never `prisma db push` — see `.claude/skills/db-migrations/` and
   `docs/DATABASE_SCHEMA.md` for why, and why non-additive changes are
   expand-contract across multiple migrations rather than one in-place edit.
3. Check the change against the cross-cutting conventions in
   `docs/DATABASE_SCHEMA.md` before generating the migration: soft deletes on
   customer-facing entities, price snapshots on order lines, an `AuditLog`
   entry for anything touching money/inventory/access, typed `config` JSON
   for anything with more than one shape.
4. Files under `prisma/migrations/` are append-only once applied anywhere
   shared (staging/prod) — write a new migration to undo one, never edit or
   delete an existing one.
5. `prisma migrate deploy` against production is run by hand, not by Vercel's
   build step — see the parent workspace's standing deploy rule.

Full rationale: `docs/DATABASE_SCHEMA.md`. Open questions affecting this
package (payment gateway placeholder, PITR retention, sensitive-field
encryption): `docs/OPEN_DECISIONS.md`.
