// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterAll, describe, expect, it } from "vitest";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/reviews",
  { timeout: 20000 },
  () => {
    const email = `review-route-${crypto.randomUUID()}@example.com`;

    afterAll(async () => {
      await prisma.review.deleteMany({ where: { email } });
    });

    function post(body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/reviews", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    const review = {
      rating: 5,
      title: "Love it",
      body: "Light paddle, great grip, plays well.",
      name: "Route Test",
      email,
    };

    it("saves a review held for approval", async () => {
      const response = await post({ ...review, consent: true });
      expect(response.status).toBe(200);
      const rows = await prisma.review.findMany({ where: { email } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ isApproved: false, source: "SITE" });
    });

    it("refuses without consent or with a bad email", async () => {
      const noConsent = await post(review);
      expect(noConsent.status).toBe(400);
      expect(((await noConsent.json()) as { reason: string }).reason).toBe(
        "CONSENT_REQUIRED",
      );
      const badEmail = await post({ ...review, email: "nope", consent: true });
      expect(((await badEmail.json()) as { reason: string }).reason).toBe(
        "INVALID_EMAIL",
      );
    });

    it("quietly drops bot submissions", async () => {
      const before = await prisma.review.count({ where: { email } });
      const response = await post({ ...review, consent: true, website: "x" });
      expect(response.status).toBe(200);
      expect(await prisma.review.count({ where: { email } })).toBe(before);
    });
  },
);
