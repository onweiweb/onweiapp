---
name: db-migrations
description: Use whenever changing packages/database/prisma/schema.prisma, creating or reviewing a Prisma migration, or touching production data. Encodes the versioning/rollback workflow from docs/DATABASE_SCHEMA.md so schema changes stay reversible. A PreToolUse hook in .claude/settings.json also mechanically blocks `prisma db push`/`migrate reset` and edits to files already under prisma/migrations/ — this skill covers the reasoning and the cases the hook can't catch.
---

# Database migrations, versioning, rollback

This is a real production database (orders, payments, customer data), so
every schema change is versioned and reversible by construction — see
`docs/DATABASE_SCHEMA.md`'s "Migrations, versioning, and rollback" section
for the full rationale. This skill is the operational checklist.

## Workflow

1. **Plan Mode first** for any schema change — root `CLAUDE.md` ground rule 1
   already requires this; call out the migration and any data backfill in
   the plan.
2. **Generate the migration with `prisma migrate dev --name <description>`
   locally.** Never `prisma db push` against anything another person or
   environment depends on — it produces no migration file, so there's
   nothing to roll back to. (Also enforced by a settings.json hook.)
3. **For anything that isn't purely additive** (rename, type change, drop),
   split it into three migrations across separate changes:
   - expand: add the new column/table alongside the old one
   - backfill + dual-write: populate the new shape, write to both
   - contract: drop the old shape once nothing reads it
   This means a bad deploy rolls back by reverting the *app code*, not the
   database.
4. **In production, run `prisma migrate deploy` by hand** after the app code
   that needs it has shipped — Vercel does not run migrations as part of the
   build (see the parent workspace's standing deploy rule).
5. **Never edit or delete a migration file already applied anywhere shared**
   (staging or prod). If a migration was wrong, write a new migration that
   undoes it. (Also enforced by a settings.json hook for anything under
   `prisma/migrations/`.)
6. **Point-in-time recovery is the last resort**, not the plan — a PITR
   restore loses every write since the restore point, real orders included.
   The retention window for the actual Vercel Postgres tier is still an open
   decision (`docs/OPEN_DECISIONS.md`) — confirm it before Phase 1 launches
   rather than assuming a default.

## Schema conventions to check on every change

From `docs/DATABASE_SCHEMA.md`'s cross-cutting conventions — verify a new or
changed model still follows these before generating the migration:

- Soft delete (`deletedAt`) on customer-facing entities, not hard delete.
- Price snapshot fields on `OrderItem`, never a live join to current price.
- An `AuditLog` entry for anything touching money, inventory, or access.
- A typed `config` JSON field (zod-validated per type) for anything with more
  than one shape, instead of hard-coding one shape into columns.
