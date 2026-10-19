import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const findMany = vi.fn();
vi.mock("@onwei/database", () => ({
  prisma: {
    article: {
      count: (...a: unknown[]) => count(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));

import { listPublishedArticlesPage } from "./listPublishedArticlesPage";

describe("listPublishedArticlesPage", () => {
  beforeEach(() => {
    count.mockReset();
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("only asks for published articles, newest first", async () => {
    count.mockResolvedValue(5);
    await listPublishedArticlesPage(1, 9);
    expect(count).toHaveBeenCalledWith({ where: { isPublished: true } });
    expect(findMany.mock.calls[0]![0]).toMatchObject({
      where: { isPublished: true },
      skip: 0,
      take: 9,
    });
  });

  it("skips earlier pages", async () => {
    count.mockResolvedValue(20);
    const result = await listPublishedArticlesPage(2, 9);
    expect(findMany.mock.calls[0]![0]).toMatchObject({ skip: 9, take: 9 });
    expect(result).toMatchObject({ page: 2, pageCount: 3, total: 20 });
  });

  it("clamps a page past the end to the last page", async () => {
    count.mockResolvedValue(10);
    const result = await listPublishedArticlesPage(99, 9);
    expect(result.page).toBe(2);
  });

  it("handles no articles and bad page numbers", async () => {
    count.mockResolvedValue(0);
    const result = await listPublishedArticlesPage(Number.NaN, 9);
    expect(result).toMatchObject({
      page: 1,
      pageCount: 1,
      total: 0,
      items: [],
    });
  });
});
