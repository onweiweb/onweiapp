// @vitest-environment node
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  // No request scope in tests: skip the background alert.
  return { ...actual, after: () => {} };
});

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/contact",
  { timeout: 20000 },
  () => {
    const emails: string[] = [];

    afterEach(async () => {
      await prisma.contactMessage.deleteMany({
        where: { email: { in: emails } },
      });
      emails.length = 0;
    });

    function post(body: unknown) {
      return import("./route").then(({ POST }) =>
        POST(
          new Request("http://localhost/api/contact", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        ),
      );
    }

    it("saves the message on the happy path", async () => {
      const email = `test-contact-${crypto.randomUUID()}@example.com`;
      emails.push(email);
      const response = await post({
        fullName: "Test Person",
        email,
        phone: "",
        message: "Where is my order?",
      });
      expect(response.status).toBe(200);
      expect(await prisma.contactMessage.count({ where: { email } })).toBe(1);
    });

    it("returns 400 with plain field errors and saves nothing", async () => {
      const email = `test-contact-${crypto.randomUUID()}@example.com`;
      emails.push(email);
      const response = await post({ fullName: "", email, message: "" });
      const body = (await response.json()) as {
        ok: boolean;
        errors: Record<string, string>;
      };
      expect(response.status).toBe(400);
      expect(body.errors.fullName).toBeTruthy();
      expect(body.errors.message).toBeTruthy();
      expect(await prisma.contactMessage.count({ where: { email } })).toBe(0);
    });
  },
);
