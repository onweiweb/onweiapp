export const PAGE_SIZE = 50;

/** Reads a 1-based `?page=` value, falling back to 1 for anything invalid. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/**
 * Prisma `skip`/`take` for a page. Fetches one extra row so the caller can
 * tell whether a next page exists without running a separate count query.
 */
export function pageWindow(page: number, pageSize: number = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize + 1 };
}

/** Trims the extra look-ahead row and reports whether a next page exists. */
export function trimPage<T>(rows: T[], pageSize: number = PAGE_SIZE) {
  return { rows: rows.slice(0, pageSize), hasNext: rows.length > pageSize };
}
