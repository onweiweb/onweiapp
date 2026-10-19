// @vitest-environment node
import {
  createStaffSessionToken,
  STAFF_SESSION_COOKIE_NAME,
} from "@onwei/auth";
import { prisma } from "@onwei/database";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../../_lib/triggerCatalogRevalidate", () => ({
  triggerCatalogRevalidate: vi.fn(),
}));
vi.mock("../../../_lib/triggerCatalogRevalidate", () => ({
  triggerCatalogRevalidate: vi.fn(),
}));

process.env.ADMIN_SESSION_JWT_SECRET ??= "test-admin-session-secret";

describe.skipIf(!process.env.DATABASE_URL)(
  "POST /api/content/articles",
  { timeout: 20000 },
  () => {
    let cookieHeader: string;
    let staffUserId: string;
    const slugs: string[] = [];

    beforeAll(async () => {
      const email = `test-route-superadmin-${crypto.randomUUID()}@example.com`;
      process.env.SUPERADMIN_EMAIL = email;
      const staffUser = await prisma.staffUser.create({
        data: { email, passwordHash: "not-a-real-hash", name: "Test Admin" },
      });
      staffUserId = staffUser.id;
      const token = await createStaffSessionToken(
        { staffUserId },
        process.env.ADMIN_SESSION_JWT_SECRET!,
      );
      cookieHeader = `${STAFF_SESSION_COOKIE_NAME}=${token}`;
    });

    afterAll(async () => {
      await prisma.staffUser.delete({ where: { id: staffUserId } });
    });

    afterEach(async () => {
      const found = await prisma.article.findMany({
        where: { slug: { in: slugs } },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: found.map((a) => a.id) } },
      });
      await prisma.article.deleteMany({ where: { slug: { in: slugs } } });
      slugs.length = 0;
    });

    function post(body: unknown, withSession = true) {
      return new Request("http://localhost/api/content/articles", {
        method: "POST",
        headers: withSession ? { cookie: cookieHeader } : {},
        body: JSON.stringify(body),
      });
    }

    it("returns 401 with no session", async () => {
      const { POST } = await import("./route");
      const response = await POST(post({ title: "x", slug: "x" }, false));
      expect(response.status).toBe(401);
    });

    it("creates a draft article", async () => {
      const { POST } = await import("./route");
      const slug = `test-article-${crypto.randomUUID()}`;
      slugs.push(slug);
      const response = await POST(
        post({ title: "Test post", slug, bodyHtml: "<p>Hi</p>" }),
      );
      expect(response.status).toBe(201);
      const row = await prisma.article.findUnique({ where: { slug } });
      expect(row?.isPublished).toBe(false);
      expect(row?.publishedAt).toBeNull();
    });

    it("rejects a slug that is already used", async () => {
      const { POST } = await import("./route");
      const slug = `test-article-${crypto.randomUUID()}`;
      slugs.push(slug);
      await POST(post({ title: "One", slug }));
      const second = await POST(post({ title: "Two", slug }));
      expect(second.status).toBe(400);
      const data = (await second.json()) as { error: string };
      expect(data.error).toMatch(/already in use/);
    });
  },
);
