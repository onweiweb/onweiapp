import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createLegalSection,
  deleteLegalSection,
  moveLegalSection,
  updateLegalPage,
  updateLegalSection,
} from "../admin/legalPage";
import { ensureLegalPages, getLegalPage } from "./legalPage";

describe.skipIf(!process.env.DATABASE_URL)(
  "legal pages (integration)",
  { timeout: 30000 },
  () => {
    let staffUserId: string;
    let pageId: string;
    const created: string[] = [];

    beforeAll(async () => {
      staffUserId = (await prisma.staffUser.findFirstOrThrow()).id;
      await ensureLegalPages();
      pageId = (
        await prisma.legalPage.findUniqueOrThrow({
          where: { slug: "privacy" },
        })
      ).id;
    });

    afterAll(async () => {
      await prisma.legalSection.deleteMany({ where: { id: { in: created } } });
    });

    it("creates both starting pages once and never overwrites edits", async () => {
      const before = await prisma.legalSection.count({ where: { pageId } });
      expect(before).toBeGreaterThan(5);
      await ensureLegalPages();
      expect(await prisma.legalSection.count({ where: { pageId } })).toBe(
        before,
      );
      expect(await getLegalPage("terms")).not.toBeNull();
    });

    it("returns only visible sections, in order", async () => {
      const section = await createLegalSection(
        pageId,
        { heading: "Hidden test point", body: "x", isActive: false },
        { staffUserId },
      );
      created.push(section.id);
      const page = await getLegalPage("privacy");
      expect(page?.sections.some((s) => s.id === section.id)).toBe(false);
    });

    it("edits, moves and deletes a section with audit entries", async () => {
      const section = await createLegalSection(
        pageId,
        { heading: "Test point", body: "Hello" },
        { staffUserId },
      );
      created.push(section.id);

      await updateLegalSection(
        section.id,
        { body: "Changed" },
        { staffUserId },
      );
      await moveLegalSection(section.id, "up", { staffUserId });
      const moved = await prisma.legalSection.findUniqueOrThrow({
        where: { id: section.id },
      });
      expect(moved.body).toBe("Changed");
      expect(moved.sortOrder).toBeLessThan(section.sortOrder);

      await deleteLegalSection(section.id, { staffUserId });
      expect(
        await prisma.legalSection.findUnique({ where: { id: section.id } }),
      ).toBeNull();

      const actions = await prisma.auditLog.findMany({
        where: { entityId: section.id },
        select: { action: true },
      });
      expect(actions.map((a) => a.action).sort()).toEqual([
        "legalSection.create",
        "legalSection.delete",
        "legalSection.move",
        "legalSection.update",
      ]);
    });

    it("updates the page title and intro", async () => {
      const original = await prisma.legalPage.findUniqueOrThrow({
        where: { id: pageId },
      });
      const page = await updateLegalPage(
        pageId,
        { intro: "New intro" },
        { staffUserId },
      );
      expect(page.intro).toBe("New intro");
      await updateLegalPage(pageId, { intro: original.intro }, { staffUserId });
    });
  },
);
