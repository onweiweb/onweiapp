"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminBadge,
  AdminButton,
  AdminDialog,
  AdminInput,
  CopyText,
  Field,
  useToast,
  type StatusTone,
} from "./ui";

type ShipmentStatus =
  | "SENDING"
  | "BOOKED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNING"
  | "RETURNED"
  | "LOST"
  | "CANCELLED"
  | "FAILED";

export interface OrderDeliveryData {
  reference: string;
  status: ShipmentStatus;
  awb: string | null;
  courier: string | null;
  courierStatus: string | null;
  trackingUrl: string | null;
  error: string | null;
  unsure: boolean;
  /** iThink has it but we have no tracking number. */
  needsTrackingNumber: boolean;
  checkedOn: string | null;
  attempts: number;
  /** The courier couldn't deliver and nobody has chosen what to do yet. */
  failedOn: string | null;
  failedReason: string | null;
}

const STATUS: Record<ShipmentStatus, { label: string; tone: StatusTone }> = {
  SENDING: { label: "Sending to iThink", tone: "pending" },
  BOOKED: { label: "Booked, waiting for pickup", tone: "pending" },
  IN_TRANSIT: { label: "On the way", tone: "active" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "active" },
  DELIVERED: { label: "Delivered", tone: "success" },
  RETURNING: { label: "Coming back to us", tone: "problem" },
  RETURNED: { label: "Came back to us", tone: "problem" },
  LOST: { label: "Lost by the courier", tone: "problem" },
  CANCELLED: { label: "Booking cancelled", tone: "pending" },
  FAILED: { label: "Not sent", tone: "problem" },
};

const OPEN: ShipmentStatus[] = [
  "BOOKED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "RETURNING",
];
const RESENDABLE: ShipmentStatus[] = [
  "CANCELLED",
  "FAILED",
  "RETURNED",
  "LOST",
];

async function post(
  url: string,
  body?: unknown,
): Promise<
  { ok: boolean; error?: string; message?: string } & Record<string, unknown>
> {
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

/** The order's parcel on iThink: status, tracking, and what staff can do. */
export function OrderDelivery({
  orderId,
  shipment,
  canSend,
  canUpdate,
  connected,
  estimatedItems,
}: {
  orderId: string;
  /** Items with no category box or no weight, sent with the Settings backup. */
  estimatedItems: string[];
  shipment: OrderDeliveryData | null;
  /** The order is confirmed or packed. */
  canSend: boolean;
  canUpdate: boolean;
  connected: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [awb, setAwb] = useState("");

  async function run(path: "send" | "refresh" | "tracking") {
    setBusy(true);
    const result = await post(
      `/api/orders/${orderId}/ithink/${path}`,
      path === "tracking" ? { text: awb } : undefined,
    );
    if (path === "tracking" && result.ok) setAwb("");
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
    } else {
      toast(result.message ?? "Done.", "success");
    }
    router.refresh();
  }

  const status = shipment?.status;
  const needsAwb = Boolean(shipment?.needsTrackingNumber);
  const showSend =
    canUpdate &&
    connected &&
    canSend &&
    !needsAwb &&
    (!shipment || RESENDABLE.includes(status!));
  const showCheck = canUpdate && connected && status === "SENDING" && !needsAwb;
  const showAwb = canUpdate && connected && needsAwb;
  const showRefresh =
    canUpdate && connected && status !== undefined && OPEN.includes(status);

  return (
    <div className="flex flex-col gap-3 text-sm text-onwei-blue">
      {!shipment ? (
        <p>
          {canSend
            ? "Not sent to iThink yet. Orders go automatically when they're confirmed; send it here if it didn't."
            : "This order wasn't sent to iThink."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              tone={
                shipment.unsure || needsAwb
                  ? "problem"
                  : STATUS[shipment.status].tone
              }
            >
              {needsAwb
                ? "Booked on iThink, no tracking number"
                : shipment.unsure
                  ? "No reply from iThink"
                  : STATUS[shipment.status].label}
            </AdminBadge>
            <span className="text-onwei-blue/70">
              Reference {shipment.reference}
              {shipment.attempts > 1 ? ` (try ${shipment.attempts})` : ""}
            </span>
          </div>
          {shipment.awb && status !== "FAILED" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Tracking</span>
              <CopyText
                label="tracking number"
                text={shipment.awb}
                className="max-w-[14rem]"
              />
              <span className="text-onwei-blue/70">
                {shipment.courier ?? "Courier not known yet"}
              </span>
              {shipment.trackingUrl ? (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Track
                </a>
              ) : null}
            </div>
          ) : null}
          {needsAwb ? (
            <p>
              iThink already has {shipment.reference}, but its tracking number
              never reached us. Don&apos;t send it again: that books a second
              parcel. Find {shipment.reference} in the iThink portal and paste
              its tracking number below.
            </p>
          ) : shipment.error ? (
            <p>{shipment.error}</p>
          ) : null}
          {shipment.courierStatus ? (
            <p className="text-onwei-blue/70">
              iThink says: {shipment.courierStatus}
              {shipment.checkedOn ? ` (checked ${shipment.checkedOn})` : ""}
            </p>
          ) : null}
          {status === "BOOKED" ? (
            <p className="text-onwei-blue/70">
              Print the label in the iThink portal and hand the parcel to the
              courier. The order updates by itself as iThink reports each step.
              Press &ldquo;Get latest update&rdquo; only if it looks out of
              date.
            </p>
          ) : null}
        </div>
      )}
      {shipment?.failedOn ? (
        <FailedDelivery
          orderId={orderId}
          on={shipment.failedOn}
          reason={shipment.failedReason}
          canAct={canUpdate && connected}
        />
      ) : null}
      {estimatedItems.length > 0 ? (
        <p className="text-onwei-blue/70">
          Size or weight estimated for {estimatedItems.join(", ")}: the category
          has no shipper box or the size has no weight, so the backup numbers in
          Settings were used. Check the parcel in the iThink portal before
          printing the label.
        </p>
      ) : null}
      {canUpdate && !connected ? (
        <p className="text-onwei-blue/70">
          iThink isn&apos;t connected on this site, so nothing can be sent or
          updated from here.
        </p>
      ) : null}
      {showAwb ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Tracking number from the iThink portal">
            <AdminInput
              value={awb}
              inputMode="numeric"
              onChange={(e) => setAwb(e.target.value)}
            />
          </Field>
          <AdminButton
            type="button"
            disabled={busy || awb.trim() === ""}
            onClick={() => run("tracking")}
          >
            {busy ? "Saving..." : "Save tracking number"}
          </AdminButton>
        </div>
      ) : null}
      {showSend || showCheck || showRefresh ? (
        <div className="flex flex-wrap gap-2">
          {showSend ? (
            <AdminButton
              type="button"
              disabled={busy}
              onClick={() => run("send")}
            >
              {busy
                ? "Sending..."
                : shipment
                  ? "Send to iThink again"
                  : "Send to iThink"}
            </AdminButton>
          ) : null}
          {showCheck ? (
            <AdminButton
              type="button"
              disabled={busy}
              onClick={() => run("send")}
            >
              {busy ? "Checking..." : "Check again"}
            </AdminButton>
          ) : null}
          {showRefresh ? (
            <AdminButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => run("refresh")}
            >
              {busy ? "Asking iThink..." : "Get latest update"}
            </AdminButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function tomorrow(): string {
  const day = new Date(Date.now() + 24 * 60 * 60_000 + 330 * 60_000);
  return day.toISOString().slice(0, 10);
}

/** "The courier couldn't deliver": try again on a day, or send it back. */
function FailedDelivery({
  orderId,
  on,
  reason,
  canAct,
}: {
  orderId: string;
  on: string;
  reason: string | null;
  canAct: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<"again" | "back" | null>(null);
  const [date, setDate] = useState(tomorrow);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const result = await post(
      `/api/orders/${orderId}/ithink/failed-delivery`,
      open === "again"
        ? { action: "REATTEMPT", date, phone, address }
        : { action: "RTO", remark },
    );
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    toast(result.message ?? "Sent to iThink.", "success");
    setOpen(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-onwei-blue/30 p-3">
      <AdminBadge tone="problem">Courier couldn&apos;t deliver</AdminBadge>
      <p>
        The courier tried on {on} and couldn&apos;t deliver
        {reason ? `: ${reason}` : ""}. Call the customer if you can, then tell
        the courier what to do.
      </p>
      {canAct ? (
        <div className="flex flex-wrap gap-2">
          <AdminButton type="button" onClick={() => setOpen("again")}>
            Try again
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => setOpen("back")}
          >
            Send it back to us
          </AdminButton>
        </div>
      ) : null}
      <AdminDialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "back" ? "Send it back to us" : "Try delivering again"}
        description={
          open === "back"
            ? "The courier brings the parcel back to the warehouse. You can refund or reship once it arrives."
            : "The courier tries again on the day you pick. Add a new phone or address only if the customer gave you one."
        }
        size="sm"
      >
        <div className="flex flex-col gap-3">
          {open === "again" ? (
            <>
              <Field label="Day to try again">
                <AdminInput
                  type="date"
                  value={date}
                  min={tomorrow()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field
                label="New phone number (optional)"
                hint="Only if the customer gave a different one."
              >
                <AdminInput
                  value={phone}
                  inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field
                label="New address (optional)"
                hint="Full address in one line, including the PIN code."
              >
                <AdminInput
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field
              label="Why it's coming back"
              hint="The courier sees this, for example: customer refused it."
            >
              <AdminInput
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => setOpen(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="button"
              disabled={busy || (open === "back" ? !remark.trim() : !date)}
              onClick={submit}
            >
              {busy
                ? "Sending..."
                : open === "back"
                  ? "Send it back"
                  : "Ask the courier to try again"}
            </AdminButton>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}

/** Orders list: asks iThink about every open order, 50 per request. */
export function UpdateAllShipmentsButton({ open }: { open: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(0);

  async function update() {
    setBusy(true);
    setChecked(0);
    const startedAt = new Date().toISOString();
    let total = 0;
    let changed = 0;
    let failed = false;
    for (;;) {
      const result = await post("/api/orders/ithink/refresh", { startedAt });
      if (!result.ok) {
        toast(
          result.error ?? "Couldn't get updates from iThink. Try again.",
          "error",
        );
        failed = true;
        break;
      }
      total += Number(result.checked);
      changed += Number(result.changed);
      setChecked(total);
      if (Number(result.remaining) === 0 || Number(result.checked) === 0) break;
    }
    setBusy(false);
    if (!failed) {
      toast(
        total === 0
          ? "No orders on their way right now."
          : `Checked ${total} ${total === 1 ? "order" : "orders"}, ${changed} moved on.`,
        "success",
      );
    }
    router.refresh();
  }

  return (
    <AdminButton
      type="button"
      variant="secondary"
      onClick={update}
      disabled={busy}
    >
      {busy
        ? `Updating... ${checked}`
        : `Update ${open} open ${open === 1 ? "shipment" : "shipments"} from iThink`}
    </AdminButton>
  );
}
