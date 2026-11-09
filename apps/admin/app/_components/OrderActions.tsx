"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminInput, Field, useConfirm, useToast } from "./ui";

async function post(
  url: string,
  body?: unknown,
): Promise<{
  ok: boolean;
  error?: string;
  refunded?: boolean;
  refundProblem?: string;
}> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as { ok: boolean; error?: string };
  } catch {
    return {
      ok: false,
      error: "Something went wrong. Check your connection and try again.",
    };
  }
}

export function ShipForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [courierName, setCourier] = useState("");
  const [trackingNumber, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const result = await post(`/api/orders/${orderId}/ship`, {
          courierName,
          trackingNumber,
        });
        setBusy(false);
        if (!result.ok)
          return toast(result.error ?? "That didn't work.", "error");
        toast(
          "Marked as shipped. The customer sees the tracking number on their order.",
          "success",
        );
        router.refresh();
      }}
    >
      <Field label="Courier" className="w-48">
        <AdminInput
          value={courierName}
          onChange={(e) => setCourier(e.target.value)}
          placeholder="e.g. Delhivery"
        />
      </Field>
      <Field label="Tracking number" className="w-56">
        <AdminInput
          value={trackingNumber}
          onChange={(e) => setTracking(e.target.value)}
        />
      </Field>
      <AdminButton
        type="submit"
        disabled={busy || !courierName.trim() || !trackingNumber.trim()}
      >
        {busy ? "Saving..." : "Mark shipped"}
      </AdminButton>
    </form>
  );
}

export function SimpleOrderAction({
  orderId,
  path,
  label,
  confirmTitle,
  confirmMessage,
  done,
}: {
  orderId: string;
  path: "cod-collected" | "attention";
  label: string;
  confirmTitle?: string;
  confirmMessage?: string;
  done: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  return (
    <AdminButton
      type="button"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        if (
          confirmMessage &&
          !(await confirm({
            title: confirmTitle,
            message: confirmMessage,
            confirmLabel: label,
          }))
        )
          return;
        setBusy(true);
        const result = await post(`/api/orders/${orderId}/${path}`);
        setBusy(false);
        if (!result.ok)
          return toast(result.error ?? "That didn't work.", "error");
        toast(done, "success");
        router.refresh();
      }}
    >
      {label}
    </AdminButton>
  );
}

export function CancelOrderForm({
  orderId,
  paidOnline,
}: {
  orderId: string;
  paidOnline: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await confirm({
          title: "Cancel this order?",
          message: paidOnline
            ? "Stock goes back on sale, coupon uses are given back, and the full payment is refunded to the customer through Razorpay. This can't be undone."
            : "Stock goes back on sale and coupon uses are given back. This can't be undone.",
          confirmLabel: "Cancel order",
          danger: true,
        });
        if (!ok) return;
        setBusy(true);
        const result = await post(`/api/orders/${orderId}/cancel`, { reason });
        setBusy(false);
        if (!result.ok)
          return toast(result.error ?? "That didn't work.", "error");
        toast(
          result.refundProblem
            ? `Cancelled, but the refund didn't go through: ${result.refundProblem}`
            : result.refunded
              ? "Cancelled and refunded."
              : "Cancelled.",
          result.refundProblem ? "error" : "success",
        );
        router.refresh();
      }}
    >
      <Field label="Reason (the customer sees this)" className="w-80">
        <AdminInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Out of stock after a stock count"
        />
      </Field>
      <AdminButton
        type="submit"
        variant="danger"
        disabled={busy || reason.trim().length < 3}
      >
        {busy ? "Cancelling..." : "Cancel order"}
      </AdminButton>
    </form>
  );
}

export function RefundForm({
  orderId,
  maxRupees,
}: {
  orderId: string;
  maxRupees: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = Number(amount);
        const ok = await confirm({
          title: `Refund ₹${value.toLocaleString("en-IN")}?`,
          message:
            "The money goes back to the way the customer paid, usually within 5 to 7 working days. This can't be undone.",
          confirmLabel: "Refund",
          danger: true,
        });
        if (!ok) return;
        setBusy(true);
        const result = await post(`/api/orders/${orderId}/refund`, {
          amount: value,
          note,
        });
        setBusy(false);
        if (!result.ok)
          return toast(result.error ?? "That didn't work.", "error");
        toast("Refund sent.", "success");
        setAmount("");
        setNote("");
        router.refresh();
      }}
    >
      <Field
        label={`Amount (₹, up to ${maxRupees.toLocaleString("en-IN")})`}
        className="w-56"
      >
        <AdminInput
          type="number"
          min={1}
          max={maxRupees}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Note for the record" className="w-72">
        <AdminInput
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Goodwill for late delivery"
        />
      </Field>
      <AdminButton
        type="submit"
        variant="secondary"
        disabled={busy || !(Number(amount) > 0)}
      >
        {busy ? "Refunding..." : "Refund"}
      </AdminButton>
    </form>
  );
}

type ReturnAction =
  "approve" | "reject" | "pickedUp" | "received" | "refund" | "exchanged";

/** The next step(s) for one return, depending on where it is. */
export function ReturnSteps({
  returnId,
  status,
  resolution,
  refundLabel,
}: {
  returnId: string;
  status: string;
  resolution: "REFUND" | "EXCHANGE";
  refundLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function run(
    action: ReturnAction,
    extra: Record<string, unknown> = {},
    done = "Done.",
  ) {
    setBusy(true);
    const result = await post(`/api/returns/${returnId}/action`, {
      action,
      ...extra,
    });
    setBusy(false);
    if (!result.ok) return toast(result.error ?? "That didn't work.", "error");
    toast(done, "success");
    setRejecting(false);
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Why (the customer sees this)" className="w-72">
          <AdminInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Item shows signs of use"
          />
        </Field>
        <AdminButton
          type="button"
          variant="danger"
          disabled={busy || reason.trim().length < 3}
          onClick={() => run("reject", { reason }, "Return rejected.")}
        >
          Reject
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => setRejecting(false)}
        >
          Back
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "REQUESTED" ? (
        <>
          <AdminButton
            type="button"
            disabled={busy}
            onClick={() => run("approve", {}, "Approved. Arrange the pickup.")}
          >
            Approve
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            Reject
          </AdminButton>
        </>
      ) : null}
      {status === "APPROVED" ? (
        <AdminButton
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => run("pickedUp", {}, "Marked as picked up.")}
        >
          Picked up
        </AdminButton>
      ) : null}
      {status === "APPROVED" || status === "PICKED_UP" ? (
        <>
          <AdminButton
            type="button"
            disabled={busy}
            onClick={() =>
              run("received", { restock: true }, "Received. Back in stock.")
            }
          >
            Received, put back in stock
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run("received", { restock: false }, "Received, not restocked.")
            }
          >
            Received, damaged
          </AdminButton>
        </>
      ) : null}
      {status === "RECEIVED" && resolution === "REFUND" ? (
        <AdminButton
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await confirm({
              title: `Refund ${refundLabel}?`,
              message: "This sends the money back. It can't be undone.",
              confirmLabel: "Refund",
              danger: true,
            });
            if (ok) await run("refund", {}, "Refunded.");
          }}
        >
          Refund {refundLabel}
        </AdminButton>
      ) : null}
      {status === "RECEIVED" && resolution === "EXCHANGE" ? (
        <AdminButton
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              "exchanged",
              { note: "Replacement sent" },
              "Marked as exchanged.",
            )
          }
        >
          Replacement sent
        </AdminButton>
      ) : null}
    </div>
  );
}
