import { prisma, type SmsStatus } from "@onwei/database";

/**
 * MSG91 delivery reports ("On Report Received" webhook, JSON). The URL
 * carries MSG91_WEBHOOK_TOKEN, checked with webhookTokenMatches. A body can
 * be one report or a list. status "1" delivered, "2" (and the rejected or
 * blocked codes) failed, "0" sent.
 */
export interface Msg91Report {
  requestId: string;
  status: SmsStatus;
  failureReason?: string;
  at: Date;
}

const FAILED_CODES = new Set(["2", "9", "16", "17", "20", "25"]);

function str(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toDate(value: unknown): Date {
  const text = str(value);
  const date = text ? new Date(text) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function readOne(item: unknown): Msg91Report | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const requestId = str(row.requestId) ?? str(row.request_id);
  const code = str(row.status);
  if (!requestId || code === undefined) return null;
  let status: SmsStatus;
  if (code === "1") status = "DELIVERED";
  else if (FAILED_CODES.has(code)) status = "FAILED";
  else if (code === "0") status = "SENT";
  else return null;
  const reason = str(row.failureReason);
  return {
    requestId,
    status,
    at: toDate(status === "DELIVERED" ? row.deliveryTime : undefined),
    ...(status === "FAILED"
      ? { failureReason: (reason ?? `Failed (code ${code})`).slice(0, 200) }
      : {}),
  };
}

/** Reads a webhook body into reports. Pure, so every shape is tested. */
export function parseMsg91Reports(body: unknown): Msg91Report[] {
  const items = Array.isArray(body) ? body : [body];
  return items
    .map(readOne)
    .filter((report): report is Msg91Report => report !== null);
}

const RANK: Record<SmsStatus, number> = {
  SENDING: 0,
  SENT: 1,
  FAILED: 1,
  DELIVERED: 2,
};

/** Statuses only move forward; "failed" never lands on a delivered text. */
export function nextSmsStatus(
  current: SmsStatus,
  incoming: SmsStatus,
): SmsStatus | null {
  if (current === incoming) return null;
  if (incoming === "FAILED") return current === "DELIVERED" ? null : "FAILED";
  if (current === "FAILED") return null;
  return RANK[incoming] > RANK[current] ? incoming : null;
}

/** Applies one report. Returns whether a message changed. */
export async function applyMsg91Report(report: Msg91Report): Promise<boolean> {
  const message = await prisma.smsMessage.findUnique({
    where: { providerRequestId: report.requestId },
    select: { id: true, status: true },
  });
  if (!message) return false;
  const status = nextSmsStatus(message.status, report.status);
  if (!status) return false;
  const updated = await prisma.smsMessage.updateMany({
    // Compare-and-set on the old status, so two reports at once can't
    // undo each other.
    where: { id: message.id, status: message.status },
    data: {
      status,
      ...(status === "SENT" ? { sentAt: report.at } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: report.at } : {}),
      ...(status === "FAILED"
        ? { failedAt: report.at, failureReason: report.failureReason ?? null }
        : {}),
    },
  });
  return updated.count === 1;
}
