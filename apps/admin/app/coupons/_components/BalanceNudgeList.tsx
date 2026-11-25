"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminButton,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  useConfirm,
  useToast,
} from "../../_components/ui";

export interface UnpaidPreorder {
  orderId: string;
  orderNumber: string;
  tierLabel: string | null;
  /** Paise. */
  reserveTotal: number;
  balanceDue: number;
  paidAt: string | null;
  nudgedAt: string | null;
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const WHEN = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/**
 * Pre-orders with the balance still to pay, and "Send balance nudge" for the
 * ticked ones or all of them. A nudge emails and WhatsApps the customer, is
 * timed on the order, and ends their chance to cancel.
 */
export function BalanceNudgeList({
  campaignId,
  orders,
  canNudge,
  nudgeDate,
}: {
  campaignId: string;
  orders: UnpaidPreorder[];
  canNudge: boolean;
  /** When the daily job nudges everyone, "23 Dec". */
  nudgeDate: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const open = orders.filter((o) => !o.nudgedAt);

  async function send(orderIds: string[] | null) {
    const count = orderIds ? orderIds.length : open.length;
    const ok = await confirm({
      title: `Send the balance nudge to ${count} pre-order${count === 1 ? "" : "s"}?`,
      message:
        "Each customer gets an email and WhatsApp asking them to pay the balance before the due date. After this they can't cancel the pre-order themselves.",
      confirmLabel: "Send nudge",
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/preorders/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderIds ? { orderIds } : { campaignId }),
    }).catch(() => null);
    setBusy(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      nudged?: number;
      skipped?: number;
    } | null;
    if (!response?.ok || !data?.ok) {
      toast(data?.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(
      `Nudge sent to ${data.nudged ?? 0}.${data.skipped ? ` ${data.skipped} were already reminded or paid.` : ""}`,
      "success",
    );
    setPicked([]);
    router.refresh();
  }

  if (orders.length === 0)
    return (
      <p className="text-sm text-onwei-blue/70">
        Every reserved pre-order has paid its balance.
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      {canNudge ? (
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            disabled={busy || picked.length === 0}
            onClick={() => send(picked)}
          >
            Send balance nudge to {picked.length || "ticked"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy || open.length === 0}
            onClick={() => send(null)}
          >
            Nudge all not yet reminded ({open.length})
          </AdminButton>
        </div>
      ) : null}
      <p className="text-sm text-onwei-blue/70">
        Everyone not yet reminded gets the nudge automatically on {nudgeDate}.
      </p>
      <AdminTable>
        <AdminTableHead>
          <AdminTableHeaderCell>
            <span className="sr-only">Pick</span>
          </AdminTableHeaderCell>
          <AdminTableHeaderCell>Order</AdminTableHeaderCell>
          <AdminTableHeaderCell>Lap</AdminTableHeaderCell>
          <AdminTableHeaderCell>Reserve paid</AdminTableHeaderCell>
          <AdminTableHeaderCell>Balance to pay</AdminTableHeaderCell>
          <AdminTableHeaderCell>Nudge sent</AdminTableHeaderCell>
        </AdminTableHead>
        <tbody>
          {orders.map((o) => (
            <AdminTableRow key={o.orderId}>
              <AdminTableCell>
                <input
                  type="checkbox"
                  aria-label={`Pick ${o.orderNumber}`}
                  disabled={!canNudge || Boolean(o.nudgedAt)}
                  checked={picked.includes(o.orderId)}
                  onChange={(e) =>
                    setPicked((list) =>
                      e.target.checked
                        ? [...list, o.orderId]
                        : list.filter((id) => id !== o.orderId),
                    )
                  }
                />
              </AdminTableCell>
              <AdminTableCell>
                <Link href={`/orders/${o.orderId}`} className="underline">
                  {o.orderNumber}
                </Link>
              </AdminTableCell>
              <AdminTableCell>{o.tierLabel ?? "None"}</AdminTableCell>
              <AdminTableCell>{rupees(o.reserveTotal)}</AdminTableCell>
              <AdminTableCell>{rupees(o.balanceDue)}</AdminTableCell>
              <AdminTableCell>
                {o.nudgedAt ? WHEN.format(new Date(o.nudgedAt)) : "Not yet"}
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}
