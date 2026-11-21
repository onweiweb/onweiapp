import { timingSafeEqual } from "node:crypto";
import { prisma, type WhatsAppStatus } from "@onwei/database";
import { failureCodeOf } from "./failures";

/**
 * Gupshup webhook (Gupshup format, version 2). Gupshup's self-serve webhooks
 * are not signed, so the URL carries a long secret token
 * (GUPSHUP_WEBHOOK_TOKEN) checked here in constant time.
 */
export function webhookTokenMatches(
  given: string,
  expected: string | undefined,
): boolean {
  const want = expected?.trim();
  if (!want || want.length < 24) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type GupshupEvent =
  | {
      kind: "status";
      /** Ids to match against our providerMessageId. */
      ids: string[];
      status: WhatsAppStatus;
      failureReason?: string;
      at: Date;
    }
  | { kind: "inbound"; phone: string; text: string }
  | { kind: "ignored" };

const STATUS_MAP: Record<string, WhatsAppStatus> = {
  enqueued: "SENT",
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** Reads one webhook body. Pure, so every shape is unit tested. */
export function parseGupshupEvent(body: unknown): GupshupEvent {
  if (!body || typeof body !== "object") return { kind: "ignored" };
  const root = body as Record<string, unknown>;
  const payload = (root.payload ?? {}) as Record<string, unknown>;
  const inner = (payload.payload ?? {}) as Record<string, unknown>;
  const at =
    typeof root.timestamp === "number" ? new Date(root.timestamp) : new Date();

  if (root.type === "message-event") {
    const status = STATUS_MAP[str(payload.type) ?? ""];
    if (!status) return { kind: "ignored" };
    const ids = [str(payload.gsId), str(payload.id)].filter(
      (id): id is string => Boolean(id),
    );
    if (ids.length === 0) return { kind: "ignored" };
    // Gupshup puts Meta's empty error title first: "null, (#1009) ...".
    const reason = str(inner.reason)?.replace(/^null,\s*/i, "");
    return {
      kind: "status",
      ids,
      status,
      at,
      ...(status === "FAILED" && reason
        ? { failureReason: reason.slice(0, 200) }
        : {}),
    };
  }

  if (root.type === "message") {
    const source = str(payload.source) ?? str(payload.sender);
    const text = str(inner.text);
    if (!source || !text) return { kind: "ignored" };
    const digits = source.replace(/\D/g, "");
    if (!digits) return { kind: "ignored" };
    return { kind: "inbound", phone: `+${digits}`, text };
  }

  return { kind: "ignored" };
}

const STOP_WORDS = new Set(["stop", "unsubscribe", "stop all", "stopall"]);

export function isStopReply(text: string): boolean {
  return STOP_WORDS.has(
    text
      .trim()
      .toLowerCase()
      .replace(/[.!]+$/, ""),
  );
}

const RANK: Record<WhatsAppStatus, number> = {
  SENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 1,
};

/**
 * Statuses only move forward: a late "sent" never overwrites "read", and
 * "failed" only lands on a message that wasn't delivered.
 */
export function nextStatus(
  current: WhatsAppStatus,
  incoming: WhatsAppStatus,
): WhatsAppStatus | null {
  if (current === incoming) return null;
  if (incoming === "FAILED") {
    return current === "DELIVERED" || current === "READ" ? null : "FAILED";
  }
  if (current === "FAILED") return null;
  return RANK[incoming] > RANK[current] ? incoming : null;
}

/** Applies a delivery update. Returns whether a message changed. */
export async function applyGupshupStatus(
  event: Extract<GupshupEvent, { kind: "status" }>,
): Promise<boolean> {
  const message = await prisma.whatsAppMessage.findFirst({
    where: { providerMessageId: { in: event.ids } },
    select: { id: true, status: true },
  });
  if (!message) return false;
  const status = nextStatus(message.status, event.status);
  if (!status) return false;
  const updated = await prisma.whatsAppMessage.updateMany({
    // Compare-and-set on the old status, so two updates at once can't
    // undo each other.
    where: { id: message.id, status: message.status },
    data: {
      status,
      ...(status === "SENT" ? { sentAt: event.at } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: event.at } : {}),
      ...(status === "READ" ? { readAt: event.at } : {}),
      ...(status === "FAILED"
        ? {
            failedAt: event.at,
            failureReason: event.failureReason ?? null,
            failureCode: failureCodeOf(event.failureReason),
          }
        : {}),
    },
  });
  return updated.count === 1;
}

export async function recordWhatsAppOptOut(
  phone: string,
  source: "reply_stop" | "staff" = "reply_stop",
): Promise<void> {
  await prisma.whatsAppOptOut.upsert({
    where: { phone },
    create: { phone, source },
    update: {},
  });
}
