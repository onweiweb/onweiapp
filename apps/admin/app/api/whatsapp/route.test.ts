// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

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
  },
);
