import { describe, expect, it } from "vitest";

describe("prisma client", () => {
  it("exposes the expected model delegates for the current schema", async () => {
    // A placeholder connection string is enough here — this test proves
    // `prisma generate` produced a client matching schema.prisma, it never
    // opens a connection. The real connection is exercised in
    // client.integration.test.ts, gated on a real DATABASE_URL.
    process.env.DATABASE_URL ??=
      "postgresql://user:pass@localhost:5432/onwei_test";
    const { prisma } = await import("./client");

    expect(prisma.customer).toBeDefined();
    expect(prisma.order).toBeDefined();
    expect(prisma.product).toBeDefined();
    expect(prisma.coupon).toBeDefined();
    expect(prisma.auditLog).toBeDefined();
  });
});
