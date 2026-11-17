// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";
process.env.INSIDER_LINK_SECRET ??=
  "test-insider-link-secret-at-least-32-chars";
// A fake Gupshup: these values only reach the stubbed fetch below.
process.env.GUPSHUP_API_KEY = "test-key";
process.env.GUPSHUP_APP_NAME = "TestApp";
process.env.GUPSHUP_SOURCE_NUMBER = "919000000000";
process.env.GUPSHUP_APP_ID = "test-app-id-123";

const tag = crypto.randomUUID().slice(0, 8);
const templateName = `test_route_campaign_${tag}`;

const gupshup = vi.fn(
  async (_url: string | URL | Request, init?: RequestInit) => {
    // The template list is a GET, sends are POSTs.
    if ((init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({
          templates: [
            {
              id: "tpl-route",
              elementName: templateName,
              languageCode: "en",
              category: "UTILITY",
              status: "APPROVED",
              templateType: "TEXT",
              containerMeta: JSON.stringify({ data: "Hi {{1}}" }),
            },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        status: "submitted",
        messageId: `m-${crypto.randomUUID()}`,
      }),
      { status: 202 },
    );
  },
);

describe.skipIf(!process.env.DATABASE_URL)(
  "Insiders WhatsApp send routes",
  { timeout: 30000 },
  () => {
    const staffIds: string[] = [];
    let entryId: string;
    let phone: string;
    let plainCookie: string;
    let adminCookie: string;

    async function makeStaff(email: string): Promise<string> {
      const staff = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Staff" },
      });
      staffIds.push(staff.id);
      const token = await createStaffSessionToken(
        { staffUserId: staff.id },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      return `${STAFF_SESSION_COOKIE_NAME}=${token}`;
    }

    beforeAll(async () => {
      vi.stubGlobal("fetch", gupshup);
      plainCookie = await makeStaff(`test-wa-staff-${tag}@example.com`);
      const adminEmail = `test-wa-admin-${tag}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
      phone = `+9195${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
      const row = await prisma.waitlistEntry.create({
        data: {
          fullName: "Route Test",
          email: `wa-route-${tag}@example.test`,
          phone,
          consentVersion: "test",
        },
      });
      entryId = row.id;
    });

    afterAll(async () => {
      vi.unstubAllGlobals();
      await prisma.whatsAppMessage.deleteMany({ where: { phone } });
      await prisma.whatsAppCampaign.deleteMany({ where: { templateName } });
      await prisma.waitlistEntry.delete({ where: { id: entryId } });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    function request(path: string, cookie: string, body: unknown) {
      return new Request(`http://localhost${path}`, {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    const audience = () => ({ group: "picked", ids: [entryId] });

    it("refuses staff who can't manage Insiders", async () => {
      const { POST } = await import("./plan/route");
      const res = await POST(
        request("/api/insiders/whatsapp/plan", plainCookie, {
          audience: audience(),
          templateName,
        }),
      );
      expect(res.status).toBe(403);
    });

    it("refuses a template Gupshup doesn't have", async () => {
      const { POST } = await import("./campaigns/route");
      const res = await POST(
        request("/api/insiders/whatsapp/campaigns", adminCookie, {
          templateId: "no-such-template",
          fill: [{ kind: "firstName" }],
          audience: audience(),
        }),
      );
      expect(res.status).toBe(404);
    });

    it("plans, starts and sends a batch", async () => {
      const plan = await (
        await import("./plan/route")
      ).POST(
        request("/api/insiders/whatsapp/plan", adminCookie, {
          audience: audience(),
          templateName,
        }),
      );
      expect(await plan.json()).toMatchObject({ ok: true, willGet: 1 });

      const started = await (
        await import("./campaigns/route")
      ).POST(
        request("/api/insiders/whatsapp/campaigns", adminCookie, {
          templateId: "tpl-route",
          fill: [{ kind: "firstName" }],
          audience: audience(),
        }),
      );
      expect(started.status).toBe(201);
      const { id, ids } = (await started.json()) as {
        id: string;
        ids: string[];
      };
      expect(ids).toEqual([entryId]);

      const { POST: send } = await import("./campaigns/[id]/send/route");
      const res = await send(
        request(`/api/insiders/whatsapp/campaigns/${id}/send`, adminCookie, {
          ids,
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(await res.json()).toEqual({
        ok: true,
        sent: 1,
        failed: 0,
        skipped: 0,
      });

      const missing = await send(
        request("/api/insiders/whatsapp/campaigns/nope/send", adminCookie, {
          ids,
        }),
        { params: Promise.resolve({ id: "nope" }) },
      );
      expect(missing.status).toBe(404);
    });
  },
);
