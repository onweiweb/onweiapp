import { prisma, type SmsStatus } from "@onwei/database";
import { maskPhone } from "../whatsapp/messageLog";

/**
 * The SMS send log for admin: every text, newest first. Numbers are masked;
 * codes are never stored.
 */
export interface SmsLogRow {
  id: string;
  /** Masked number. */
  phone: string;
  /** Customer name when they were signed in, else null. */
  name: string | null;
  status: SmsStatus;
  failureReason: string | null;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
}

export interface SmsLogFilter {
  page: number;
  pageSize: number;
  status?: SmsStatus;
  /** Last digits of the number, 3 to 10 digits. */
  phoneEnding?: string;
}

export async function listSmsMessages(
  filter: SmsLogFilter,
): Promise<{ rows: SmsLogRow[]; hasNext: boolean }> {
  const ending = (filter.phoneEnding ?? "").replace(/\D/g, "").slice(-10);
  const rows = await prisma.smsMessage.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(ending.length >= 3 ? { phone: { endsWith: ending } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (Math.max(filter.page, 1) - 1) * filter.pageSize,
    take: filter.pageSize + 1,
    select: {
      id: true,
      phone: true,
      status: true,
      failureReason: true,
      createdAt: true,
      sentAt: true,
      deliveredAt: true,
      failedAt: true,
      customer: { select: { name: true } },
    },
  });
  return {
    rows: rows.slice(0, filter.pageSize).map((row) => ({
      id: row.id,
      phone: maskPhone(row.phone),
      name: row.customer?.name ?? null,
      status: row.status,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      failedAt: row.failedAt,
    })),
    hasNext: rows.length > filter.pageSize,
  };
}

export interface SmsStats {
  /** Last 30 days. */
  total: number;
  delivered: number;
  failed: number;
  /** The most common failure reason in the last 30 days, if any. */
  topFailure: { reason: string; count: number } | null;
}

export async function getSmsStats(now: Date = new Date()): Promise<SmsStats> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const where = { createdAt: { gte: since } };
  const [byStatus, failures] = await Promise.all([
    prisma.smsMessage.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.smsMessage.groupBy({
      by: ["failureReason"],
      where: { ...where, status: "FAILED", failureReason: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { failureReason: "desc" } },
      take: 1,
    }),
  ]);
  const count = (status: SmsStatus) =>
    byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const top = failures[0];
  return {
    total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    delivered: count("DELIVERED"),
    failed: count("FAILED"),
    topFailure:
      top && top.failureReason
        ? { reason: top.failureReason, count: top._count._all }
        : null,
  };
}
