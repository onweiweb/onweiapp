import { prisma } from "@onwei/database";
import type { Prisma } from "@onwei/database";
import type {
  ListWaitlistEntriesInput,
  ListWaitlistEntriesResult,
  WaitlistStats,
} from "./types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function listWaitlistEntries(
  input: ListWaitlistEntriesInput = {},
): Promise<ListWaitlistEntriesResult> {
  const pageSize = Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const page = Math.max(input.page ?? 1, 1);
  const search = input.search?.trim();

  const where: Prisma.WaitlistEntryWhereInput | undefined = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }
    : undefined;

  const skip = (page - 1) * pageSize;
  const [fetched, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      skip,
      take: pageSize + 1,
      where,
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return {
    entries: fetched.slice(0, pageSize),
    hasNext: fetched.length > pageSize,
    firstSerial: total - skip,
    total,
  };
}

export async function getWaitlistStats(): Promise<WaitlistStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, unsubscribed, joinedLast7Days] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { submittedAt: { gte: weekAgo } } }),
  ]);
  return {
    total,
    active: total - unsubscribed,
    unsubscribed,
    joinedLast7Days,
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Full unpaginated export for the admin CSV download, fine at waitlist
 * scale (thousands, not millions, of rows before December). Revisit if this
 * ever needs to stream rather than build the whole string in memory.
 */
export async function exportWaitlistEntriesToCsv(): Promise<string> {
  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { submittedAt: "desc" },
  });

  const header = [
    "Full name",
    "Email",
    "Phone",
    "Movement flex",
    "Source",
    "Submitted at",
    "Status",
  ];
  const rows = entries.map((entry) => [
    csvEscape(entry.fullName),
    csvEscape(entry.email),
    csvEscape(entry.phone),
    entry.movementFlex?.toString() ?? "",
    csvEscape(entry.source ?? ""),
    entry.submittedAt.toISOString(),
    entry.unsubscribedAt ? "Unsubscribed" : "Active",
  ]);

  return [header, ...rows].map((row) => row.join(",")).join("\n");
}
