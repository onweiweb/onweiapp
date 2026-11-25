import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7: the client connects via a driver adapter instead of a schema.prisma
// url. This uses the pooled DATABASE_URL (via PgBouncer) for normal app
// queries; prisma.config.ts separately points the CLI's migrate/introspect
// commands at the direct, non-pooled DIRECT_URL. See prisma.config.ts.
//
// `max` caps the local pg.Pool's own connections, on top of PgBouncer's
// pooling. Without it, pg's default (10) applies per warm serverless
// instance; with apps/web and apps/admin scaling independently and each
// invocation potentially holding its own pool, an unbounded default risks
// exhausting PgBouncer's own connection budget under concurrent traffic.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

// Next.js dev-mode hot reload re-executes this module on every edit, which
// would otherwise open a new Postgres connection pool each time. Caching the
// instance on `globalThis` keeps a single client across reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Interactive transactions time out after 5s by default. Tests against the
// far-away dev database set PRISMA_TRANSACTION_TIMEOUT_MS (vitest config) so
// slow round trips don't expire them; production keeps the default.
const transactionTimeout = Number(process.env.PRISMA_TRANSACTION_TIMEOUT_MS);
const transactionOptions =
  Number.isFinite(transactionTimeout) && transactionTimeout > 0
    ? { timeout: transactionTimeout, maxWait: transactionTimeout }
    : undefined;

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    ...(transactionOptions ? { transactionOptions } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
