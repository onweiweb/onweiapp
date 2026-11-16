import {
  prisma,
  type WhatsAppPurpose,
  type WhatsAppStatus,
} from "@onwei/database";

/**
 * The WhatsApp send log for admin: every message, newest first, with who it
 * went to and how far it got. Numbers are masked; codes are never stored.
 */

/** "+919876543210" becomes "+91 98•••• 3210". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "••••";
  const country = digits.length > 10 ? digits.slice(0, digits.length - 10) : "";
  const local = digits.slice(-10);
  return `${country ? `+${country} ` : ""}${local.slice(0, 2)}•••• ${local.slice(-4)}`;
}

export interface WhatsAppLogRow {
  id: string;
  purpose: WhatsAppPurpose;
  /** Masked number. */
  phone: string;
  /** Insider or customer name, null for a test send. */
  name: string | null;
  status: WhatsAppStatus;
  failureReason: string | null;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
}

export interface WhatsAppLogFilter {
  page: number;
  pageSize: number;
  purpose?: WhatsAppPurpose;
  status?: WhatsAppStatus;
  /** Last digits of the number, 3 to 10 digits. */
  phoneEnding?: string;
}

export async function listWhatsAppMessages(
  filter: WhatsAppLogFilter,
): Promise<{ rows: WhatsAppLogRow[]; hasNext: boolean }> {
  const ending = (filter.phoneEnding ?? "").replace(/\D/g, "").slice(-10);
  const rows = await prisma.whatsAppMessage.findMany({
    where: {
      ...(filter.purpose ? { purpose: filter.purpose } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(ending.length >= 3 ? { phone: { endsWith: ending } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (Math.max(filter.page, 1) - 1) * filter.pageSize,
    take: filter.pageSize + 1,
    select: {
      id: true,
      purpose: true,
      phone: true,
      status: true,
      failureReason: true,
      createdAt: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      failedAt: true,
      waitlistEntry: { select: { fullName: true } },
      customer: { select: { name: true } },
    },
  });
  return {
    rows: rows.slice(0, filter.pageSize).map((row) => ({
      id: row.id,
      purpose: row.purpose,
      phone: maskPhone(row.phone),
      name: row.waitlistEntry?.fullName ?? row.customer?.name ?? null,
      status: row.status,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      readAt: row.readAt,
      failedAt: row.failedAt,
    })),
    hasNext: rows.length > filter.pageSize,
  };
}
