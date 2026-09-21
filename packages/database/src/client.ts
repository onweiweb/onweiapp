import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7: the client connects via a driver adapter instead of a schema.prisma
// url. This uses the pooled DATABASE_URL (via PgBouncer) for normal app
// queries; prisma.config.ts separately points the CLI's migrate/introspect
// commands at the direct, non-pooled DIRECT_URL. See prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Next.js dev-mode hot reload re-executes this module on every edit, which
// would otherwise open a new Postgres connection pool each time. Caching the
// instance on `globalThis` keeps a single client across reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
