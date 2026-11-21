import { failureKindOf, failureMessage } from "@onwei/core/whatsapp-failures";
import { AdminBadge } from "./ui";

/** True when Meta held the message back (not a real failure). */
export function isHeldByMeta(code: string | null | undefined): boolean {
  return failureKindOf(code) === "HELD";
}

/** "Failed", or "Held by Meta" when it wasn't our problem. */
export function FailedBadge({ code }: { code: string | null }) {
  return isHeldByMeta(code) ? (
    <AdminBadge tone="pending">Held by Meta</AdminBadge>
  ) : (
    <AdminBadge tone="problem">Failed</AdminBadge>
  );
}

/** Why a WhatsApp failed: one plain line, WhatsApp's own words underneath. */
export function WhatsAppFailure({
  code,
  reason,
}: {
  code: string | null;
  reason: string | null;
}) {
  const message = failureMessage(code, reason);
  const raw = reason?.replace(/^null,\s*/i, "").trim() ?? "";
  return (
    <div className="mt-1 max-w-sm whitespace-normal text-xs">
      <p className="text-onwei-blue/90">{message}</p>
      {raw && raw !== message ? (
        <p className="mt-0.5 text-onwei-blue/50">{raw}</p>
      ) : null}
    </div>
  );
}
