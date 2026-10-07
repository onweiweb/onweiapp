import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteTrackedLink,
  listTrackedLinks,
  saveTrackedLink,
} from "./trackedLinks";

describe.skipIf(!process.env.DATABASE_URL)(
  "tracked links (integration)",
  { timeout: 20000 },
  () => {
    const urls: string[] = [];

    afterEach(async () => {
      await prisma.trackedLink.deleteMany({ where: { url: { in: urls } } });
      urls.length = 0;
    });

    function fixture(campaign = "test-campaign") {
      const url = `https://www.onwei.in/ontheway?utm_campaign=${campaign}-${randomUUID()}`;
      urls.push(url);
      return {
        url,
        channelId: "instagram-bio",
        pagePath: "/ontheway",
        campaign,
        content: null,
        createdById: null,
      };
    }

    it("saves a link, and saving the same link again keeps one row", async () => {
      const input = fixture();
      const first = await saveTrackedLink(input);
      const second = await saveTrackedLink(input);
      expect(second.id).toBe(first.id);
      expect(
        await prisma.trackedLink.count({ where: { url: input.url } }),
      ).toBe(1);
    });

    it("lists newest first and pages with skip and take", async () => {
      const older = await saveTrackedLink(fixture("older"));
      await new Promise((r) => setTimeout(r, 10));
      const newer = await saveTrackedLink(fixture("newer"));

      const all = await listTrackedLinks({ skip: 0, take: 50 });
      const ids = all.map((l) => l.id);
      expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));

      const firstPage = await listTrackedLinks({ skip: 0, take: 1 });
      expect(firstPage).toHaveLength(1);
      expect(firstPage[0]!.id).toBe(newer.id);
    });

    it("removes a link once, and reports false the second time", async () => {
      const saved = await saveTrackedLink(fixture());
      expect(await deleteTrackedLink(saved.id)).toBe(true);
      expect(await deleteTrackedLink(saved.id)).toBe(false);
    });
  },
);
