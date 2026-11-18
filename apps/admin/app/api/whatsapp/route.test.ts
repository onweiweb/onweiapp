// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

// What the stubbed Gupshup returns. Tests change a status to see the refusal.
const gupshup = {
  templates: [
    {
      id: "tpl-test",
      elementName: "onwei_insider_code",
      category: "UTILITY",
      status: "APPROVED",
      templateType: "TEXT",
      containerMeta: JSON.stringify({ data: "Hi {{1}}, code {{2}}" }),
    },
    {
      id: "tpl-pending",
      elementName: "onwei_insider_v3",
      category: "UTILITY",
      status: "PENDING",
      templateType: "TEXT",
      containerMeta: JSON.stringify({ data: "Hi {{1}}" }),
    },
    {
      id: "tpl-auth",
      elementName: "onwei_code",
      category: "AUTHENTICATION",
      status: "APPROVED",
      templateType: "TEXT",
      containerMeta: JSON.stringify({ data: "{{1}} is your code" }),
    },
  ],
};

describe.skipIf(!process.env.DATABASE_URL)(
  "WhatsApp template route",
  { timeout: 60000 },
  () => {
    const staffIds: string[] = [];
    let plainCookie: string;
    let adminCookie: string;
    let saved: Awaited<ReturnType<typeof prisma.whatsAppTemplate.findUnique>> =
      null;

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
      vi.stubEnv("GUPSHUP_API_KEY", "test-key");
      vi.stubEnv("GUPSHUP_APP_ID", "test-app-1234");
      const realFetch = globalThis.fetch;
      vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) =>
        String(url).startsWith("https://api.gupshup.io/")
          ? Promise.resolve(Response.json(gupshup))
          : realFetch(url, init),
      );
      saved = await prisma.whatsAppTemplate.findUnique({
        where: { purpose: "INSIDER_CODE" },
      });
      plainCookie = await makeStaff(
        `test-wa-staff-${crypto.randomUUID()}@example.com`,
      );
      const adminEmail = `test-wa-admin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = adminEmail;
      adminCookie = await makeStaff(adminEmail);
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      await prisma.whatsAppTemplate.deleteMany({
        where: { purpose: "INSIDER_CODE" },
      });
      if (saved) await prisma.whatsAppTemplate.create({ data: saved });
      await prisma.auditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await prisma.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });

    const body = {
      purpose: "INSIDER_CODE",
      gupshupTemplateId: "tpl-test",
      templateName: "onwei_insider_code",
      language: "en",
      variables: ["firstName", "insiderCode", "addressToken"],
      headerType: "NONE",
      headerImageUrl: null,
      previewText: "Hi {{1}}",
      isActive: false,
    };

    async function save(cookie: string, payload: unknown) {
      const { PUT } = await import("./templates/route");
      return PUT(
        new Request("http://localhost/api/whatsapp/templates", {
          method: "PUT",
          headers: { cookie, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
    }

    it("saves the template and writes an audit entry", async () => {
      const response = await save(adminCookie, body);
      expect(response.status).toBe(200);
      const row = await prisma.whatsAppTemplate.findUniqueOrThrow({
        where: { purpose: "INSIDER_CODE" },
      });
      expect(row.gupshupTemplateId).toBe("tpl-test");
      expect(row.isActive).toBe(false);
      const audit = await prisma.auditLog.count({
        where: {
          staffUserId: { in: staffIds },
          action: "whatsapp_template.save",
        },
      });
      expect(audit).toBe(1);
    });

    it("refuses switching on an image template with no image", async () => {
      const response = await save(adminCookie, {
        ...body,
        headerType: "IMAGE",
        isActive: true,
      });
      expect(response.status).toBe(400);
    });

    it("refuses staff without the settings permission", async () => {
      const response = await save(plainCookie, body);
      expect(response.status).toBe(403);
    });

    async function toggle(cookie: string, isActive: boolean) {
      const { PATCH } = await import("./templates/route");
      return PATCH(
        new Request("http://localhost/api/whatsapp/templates", {
          method: "PATCH",
          headers: { cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ purpose: "INSIDER_CODE", isActive }),
        }),
      );
    }

    async function errorOf(response: Response): Promise<string> {
      return ((await response.json()) as { error: string }).error;
    }

    it("refuses a template WhatsApp hasn't approved", async () => {
      const response = await save(adminCookie, {
        ...body,
        gupshupTemplateId: "tpl-pending",
      });
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toMatch(/hasn't approved/);
    });

    it("refuses a template in the wrong category", async () => {
      const response = await save(adminCookie, {
        ...body,
        gupshupTemplateId: "tpl-auth",
      });
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toMatch(/utility or marketing/);
    });

    it("switches a message on and off from its row", async () => {
      await save(adminCookie, body);
      expect((await toggle(adminCookie, true)).status).toBe(200);
      let row = await prisma.whatsAppTemplate.findUniqueOrThrow({
        where: { purpose: "INSIDER_CODE" },
      });
      expect(row.isActive).toBe(true);
      expect(row.variables).toEqual(body.variables);
      expect((await toggle(adminCookie, false)).status).toBe(200);
      row = await prisma.whatsAppTemplate.findUniqueOrThrow({
        where: { purpose: "INSIDER_CODE" },
      });
      expect(row.isActive).toBe(false);
    });

    it("won't switch on a template that lost approval, but can still switch it off", async () => {
      await save(adminCookie, body);
      gupshup.templates[0]!.status = "REJECTED";
      try {
        const on = await toggle(adminCookie, true);
        expect(on.status).toBe(400);
        expect(await errorOf(on)).toMatch(/rejected/);
        expect((await toggle(adminCookie, false)).status).toBe(200);
        expect((await save(adminCookie, body)).status).toBe(200);
      } finally {
        gupshup.templates[0]!.status = "APPROVED";
      }
    });

    it("lists only approved templates that fit the message", async () => {
      const { GET } = await import("./templates/gupshup/route");
      const response = await GET(
        new Request(
          "http://localhost/api/whatsapp/templates/gupshup?purpose=INSIDER_CODE",
          { headers: { cookie: adminCookie } },
        ),
      );
      expect(response.status).toBe(200);
      const data = (await response.json()) as {
        templates: { id: string }[];
        waiting: number;
      };
      expect(data.templates.map((t) => t.id)).toEqual(["tpl-test"]);
      expect(data.waiting).toBe(1);
    });

    it("refuses switching on for staff without the settings permission", async () => {
      expect((await toggle(plainCookie, true)).status).toBe(403);
    });
  },
);
