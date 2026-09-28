import { prisma } from "@onwei/database";
import type {
  ListWaitlistEntriesInput,
  ListWaitlistEntriesResult,
} from "./types";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

export async function listWaitlistEntries(
  input: ListWaitlistEntriesInput = {},
): Promise<ListWaitlistEntriesResult> {
  const take = Math.min(input.take ?? DEFAULT_TAKE, MAX_TAKE);
  const search = input.search?.trim();

  const entries = await prisma.waitlistEntry.findMany({
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { submittedAt: "desc" },
  });

  const hasMore = entries.length > take;
  const page = hasMore ? entries.slice(0, take) : entries;

  return {
    entries: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Full unpaginated export for the admin CSV download — fine at waitlist
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
