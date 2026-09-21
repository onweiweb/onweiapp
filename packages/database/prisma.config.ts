import { defineConfig, env } from "prisma/config";

// Prisma 7's config-loading doesn't reliably auto-load this package's local
// .env before evaluating this file, so load it explicitly (Node's built-in
// loader — no dotenv dependency needed). Missing in CI, where real env vars
// are injected directly — that's fine, hence the try/catch.
try {
  process.loadEnvFile(new URL("./.env", import.meta.url));
} catch {
  // no local .env (e.g. CI) — rely on real environment variables instead
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI (migrate/introspect) only — Neon's pooled host
    // (DATABASE_URL) runs PgBouncer, which doesn't support the advisory
    // locks Migrate needs, so the CLI uses the direct, non-pooled URL
    // instead. Runtime queries use the pooled DATABASE_URL via the
    // @prisma/adapter-pg driver adapter — see src/client.ts.
    url: env("DIRECT_URL"),
  },
});
