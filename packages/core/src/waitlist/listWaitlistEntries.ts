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

  // Members only: applications are listed in Insiders > Applications.
  const where: Prisma.WaitlistEntryWhereInput = search
    ? {
        status: "APPROVED",
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { insiderCode: { equals: search.replace(/\s+/g, "").toUpperCase() } },
        ],
      }
    : { status: "APPROVED" };

  const skip = (page - 1) * pageSize;
  const [fetched, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      skip,
      take: pageSize + 1,
      where,
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      include: { cardAddress: { select: { id: true } } },
    }),
    prisma.waitlistEntry.count({ where }),
  ]);

  return {
    entries: fetched.slice(0, pageSize).map(({ cardAddress, ...entry }) => ({
      ...entry,
      hasCardAddress: Boolean(cardAddress),
    })),
    hasNext: fetched.length > pageSize,
    firstSerial: total - skip,
    total,
  };
}

export async function getWaitlistStats(): Promise<WaitlistStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, unsubscribed, joinedLast7Days] = await Promise.all([
    prisma.waitlistEntry.count({ where: { status: "APPROVED" } }),
    prisma.waitlistEntry.count({
      where: { status: "APPROVED", unsubscribedAt: { not: null } },
    }),
    prisma.waitlistEntry.count({
      where: { status: "APPROVED", submittedAt: { gte: weekAgo } },
    }),
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
    where: { status: "APPROVED" },
    orderBy: { submittedAt: "desc" },
  });

  const header = [
    "Full name",
    "Email",
    "Phone",
    "Insider code",
    "Movement flex",
    "Source",
    "Country",
    "Region",
    "City",
    "Came from",
    "Link source",
    "Link medium",
    "Campaign",
    "Link content",
    "Submitted at",
    "Status",
  ];
  const rows = entries.map((entry) => [
    csvEscape(entry.fullName),
    csvEscape(entry.email),
    csvEscape(entry.phone),
    entry.insiderCode ?? "",
    entry.movementFlex?.toString() ?? "",
    csvEscape(entry.source ?? ""),
    csvEscape(entry.country ?? ""),
    csvEscape(entry.region ?? ""),
    csvEscape(entry.city ?? ""),
    csvEscape(entry.referrerHost ?? ""),
    csvEscape(entry.utmSource ?? ""),
    csvEscape(entry.utmMedium ?? ""),
    csvEscape(entry.utmCampaign ?? ""),
    csvEscape(entry.utmContent ?? ""),
    entry.submittedAt.toISOString(),
    entry.unsubscribedAt ? "Unsubscribed" : "Active",
  ]);

  return [header, ...rows].map((row) => row.join(",")).join("\n");
}
