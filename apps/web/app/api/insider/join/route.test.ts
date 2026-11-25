// @vitest-environment node
import { prisma } from "@onwei/database";
import { describe, expect, it } from "vitest";

function call(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe.skipIf(!process.env.DATABASE_URL)(
  "Insider invite and join routes",
  { timeout: 60000 },
  () => {
    it("says an unknown Insider number doesn't match, without details", async () => {
      const { POST } = await import("../invite/route");
      const res = await POST(call("/api/insider/invite", { code: "WEI0000" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, valid: false });
    });

    it("needs the consent box before anything else", async () => {
      const { POST } = await import("./route");
      const res = await POST(
        call("/api/insider/join", { path: "APPLY", code: "123456" }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ reason: "CONSENT_REQUIRED" });
    });

    it("refuses a join without a checked mobile code", async () => {
      const setting = await prisma.insiderSetting.findUnique({
        where: { id: "singleton" },
        select: { joinMode: true },
      });
      await prisma.insiderSetting.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", joinMode: "INVITE_OR_APPLY" },
        update: { joinMode: "INVITE_OR_APPLY" },
      });
      try {
        const { POST } = await import("./route");
        const res = await POST(
          call("/api/insider/join", {
            path: "APPLY",
            code: "123456",
            consent: true,
            fullName: "Test Person",
            email: `test-join-${crypto.randomUUID()}@example.com`,
            phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            activity: "Running",
            joinReasons: ["Events access"],
          }),
        );
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ reason: "NOT_FOUND" });
      } finally {
        await prisma.insiderSetting.update({
          where: { id: "singleton" },
          data: { joinMode: setting?.joinMode ?? "OPEN" },
        });
      }
    });
  },
);
