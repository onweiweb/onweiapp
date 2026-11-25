---
name: db-migrations
description: Use when changing packages/database/prisma/schema.prisma or writing a Prisma migration. Working commands and the rules for prod.
model: sonnet
---

# Database migrations

Real orders and payments live in prod. Every schema change is a reviewed, versioned migration.

## Steps (run from packages/database)

1. Load the dev env: `set -a && . ./.env && set +a`
2. Get the SQL: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   (`prisma migrate dev` hangs on the shadow DB here, don't use it.)
3. Save it as `prisma/migrations/<yyyymmddhhmmss>_<name>/migration.sql` with a one-line comment on why.
4. Apply to dev: `npx prisma migrate deploy`, then `npx prisma generate`.
5. Prod: the owner runs `DIRECT_URL="<prod>" npx prisma migrate deploy` BEFORE the push. Never ask for or print the URL.

## Rules

- Not purely additive (rename, type change, drop)? Split it: expand, backfill and dual-write, contract.
- Never edit or delete a migration applied to a shared DB. Write a new one that undoes it.
- Check conventions: soft delete on customer-facing rows, price snapshots on order lines,
  audit row in the same transaction for money, inventory or access changes.
