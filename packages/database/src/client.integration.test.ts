import { describe, expect, it } from "vitest";

// Skipped until a real DATABASE_URL is provided (Vercel Postgres / Neon).
// Not run as part of this scaffolding pass — see docs/PHASE_1_SCAFFOLD_PROGRESS.md.
describe.skipIf(!process.env.DATABASE_URL)(
  "prisma client (integration)",
  () => {
    it("connects to the configured database", async () => {
      const { prisma } = await import("./client");
      await prisma.$connect();
      await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
      await prisma.$disconnect();
    });
  },
);
