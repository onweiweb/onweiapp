// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";

process.env.OTP_HASH_SECRET ??= "test-otp-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/auth/request-otp",
  { timeout: 20000 },
  () => {
    const createdIdentifiers: string[] = [];

    afterEach(async () => {
      await prisma.otpChallenge.deleteMany({
        where: { identifier: { in: createdIdentifiers } },
      });
      createdIdentifiers.length = 0;
    });

    it("returns 200 and never leaks the code in the response body", async () => {
      const { POST } = await import("./route");
      const identifier = `test-route-${crypto.randomUUID()}@example.com`;
      createdIdentifiers.push(identifier);

      const response = await POST(
        new Request("http://localhost/api/auth/request-otp", {
          method: "POST",
          body: JSON.stringify({ identifier, channel: "EMAIL" }),
        }),
      );
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(JSON.stringify(body)).not.toMatch(/"code"/);
    });

    it("returns 400 for a missing identifier", async () => {
      const { POST } = await import("./route");

      const response = await POST(
        new Request("http://localhost/api/auth/request-otp", {
          method: "POST",
          body: JSON.stringify({ channel: "EMAIL" }),
        }),
      );

      expect(response.status).toBe(400);
    });
  },
);
