"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminBadge,
  AdminButton,
  AdminDialog,
  AdminInput,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  CopyText,
  Field,
  useConfirm,
  useToast,
  type StatusTone,
} from "../_components/ui";

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

export interface CardShipRowData {
  id: string;
  name: string;
  addressShort: string;
  addressFull: string;
  /** The saved address, for the Edit address popup. */
  address: AddressValues;
  cardNumber: number | null;
  postedOn: string | null;
  shipment: {
    reference: string;
    status: ShipmentStatus;
    awb: string | null;
    courier: string | null;
    courierStatus: string | null;
    trackingUrl: string | null;
    error: string | null;
    addressChanged: boolean;
    unsure: boolean;
    deliveredOn: string | null;
    checkedOn: string | null;
  } | null;
}

type Reply = { ok: boolean; error?: string } & Record<string, unknown>;

interface AddressValues {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

type AddressField = keyof AddressValues;

const FIELD_ERRORS: Partial<Record<AddressField, string>> = {
  fullName: "Enter their name.",
  phone: "A 10 digit Indian mobile number.",
  line1: "Enter the house and street.",
  city: "Enter the city.",
  state: "Pick the state.",
  postalCode: "6 digits.",
};

/**
 * Staff fix a card address (Ready to send, Needs a look). What the second
 * button does depends on where the card is: send it, or cancel the old
 * iThink booking and send it again.
 */
function EditAddressButton({
  row,
  states,
  canSend,
}: {
  row: CardShipRowData;
  states: string[];
  canSend: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AddressValues>(row.address);
  const [bad, setBad] = useState<AddressField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = row.shipment?.status;
  const unsure = status === "SENDING";

  const sendLabel =
    status === "BOOKED"
      ? "Save, cancel old booking and send again"
      : status === "RETURNING" || row.cardNumber === null || !canSend
        ? null
        : !row.shipment || status === "CANCELLED"
          ? "Save and send"
          : "Save and send again";

  const set =
    (key: AddressField) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>,
    ) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  async function save(send: boolean) {
    setBusy(true);
    setError(null);
    const result = await post(
      `/api/insiders/addresses/${row.id}/details`,
      { ...values, send },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) {
      setBad((result.fields as AddressField[] | undefined) ?? []);
      setError(result.error ?? "That didn't save. Try again.");
      return;
    }
    setBad([]);
    setOpen(false);
    toast(
      String(result.message ?? "Address saved."),
      result.warning ? "error" : "success",
    );
    router.refresh();
  }

  const field = (key: AddressField, label: string, input: React.ReactNode) => (
    <Field
      label={label}
      error={bad.includes(key) ? (FIELD_ERRORS[key] ?? null) : null}
    >
      {input}
    </Field>
  );

  return (
    <>
      <AdminButton
        type="button"
        variant="secondary"
        disabled={unsure}
        title={unsure ? 'Press "Check again" first' : undefined}
        onClick={() => {
          setValues(row.address);
          setBad([]);
          setError(null);
          setOpen(true);
        }}
      >
        Edit address
      </AdminButton>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${row.name}'s card address`}
        description={
          status === "BOOKED"
            ? "iThink still has the old address on its booking. Save only keeps that booking; the other button cancels it and books the card again with this address."
            : status === "RETURNING"
              ? "The card is on its way back. Save the right address now and send it again once it's back."
              : "Fix the address the card goes to."
        }
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          {row.shipment?.error && status === "FAILED" ? (
            <p className="rounded-[12px] bg-onwei-beige px-3 py-2 text-sm text-onwei-blue">
              iThink said: {row.shipment.error}
            </p>
          ) : null}
          {field(
            "fullName",
            "Name",
            <AdminInput value={values.fullName} onChange={set("fullName")} />,
          )}
          {field(
            "phone",
            "Phone",
            <AdminInput
              value={values.phone}
              onChange={set("phone")}
              inputMode="tel"
            />,
          )}
          {field(
            "line1",
            "Address line 1",
            <AdminInput value={values.line1} onChange={set("line1")} />,
          )}
          <Field label="Address line 2 (optional)">
            <AdminInput value={values.line2} onChange={set("line2")} />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            {field(
              "city",
              "City",
              <AdminInput value={values.city} onChange={set("city")} />,
            )}
            {field(
              "state",
              "State",
              <AdminSelect value={values.state} onChange={set("state")}>
                {states.includes(values.state) ? null : (
                  <option value="">Pick a state</option>
                )}
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </AdminSelect>,
            )}
            {field(
              "postalCode",
              "PIN code",
              <AdminInput
                value={values.postalCode}
                onChange={set("postalCode")}
                inputMode="numeric"
              />,
            )}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-onwei-black">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <AdminButton
              type="submit"
              variant={sendLabel ? "secondary" : "primary"}
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : sendLabel && status === "BOOKED"
                  ? "Save only"
                  : "Save"}
            </AdminButton>
            {sendLabel ? (
              <AdminButton
                type="button"
                disabled={busy}
                onClick={() => void save(true)}
              >
                {sendLabel}
              </AdminButton>
            ) : null}
          </div>
        </form>
      </AdminDialog>
    </>
  );
}

async function post(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<Reply> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await response.json()) as Reply;
  } catch {
    return {
      ok: false,
      error: "Something went wrong. Check your connection and try again.",
    };
  }
}

const STATUS: Record<ShipmentStatus, { label: string; tone: StatusTone }> = {
  SENDING: { label: "Sending", tone: "pending" },
  BOOKED: { label: "Booked, waiting for pickup", tone: "pending" },
  IN_TRANSIT: { label: "On the way", tone: "active" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "active" },
  DELIVERED: { label: "Delivered", tone: "success" },
  RETURNING: { label: "Coming back to us", tone: "problem" },
  RETURNED: { label: "Came back to us", tone: "problem" },
  LOST: { label: "Lost by the courier", tone: "problem" },
  CANCELLED: { label: "Cancelled", tone: "pending" },
  FAILED: { label: "Not sent", tone: "problem" },
};

interface SendTotals {
  booked: number;
  failed: number;
  unsure: number;
}

function sendSummary(t: SendTotals): { text: string; good: boolean } {
  const parts = [`${t.booked} booked on iThink`];
  if (t.failed > 0) parts.push(`${t.failed} refused (see "Needs a look")`);
  if (t.unsure > 0)
    parts.push(`${t.unsure} with no reply yet (press "Check again" later)`);
  return { text: `${parts.join(", ")}.`, good: t.failed + t.unsure === 0 };
}

function add(totals: SendTotals, result: Reply): SendTotals {
  return {
    booked: totals.booked + Number(result.booked ?? 0),
    failed: totals.failed + Number(result.failed ?? 0),
    unsure: totals.unsure + Number(result.unsure ?? 0),
  };
}

/** Sends every ready card, 10 per request, until none are left. */
export function SendAllReadyButton({ ready }: { ready: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function sendAll() {
    const ok = await confirm({
      title: `Send ${ready} ${ready === 1 ? "card" : "cards"} to iThink?`,
      message:
        'Each card is booked with a courier and shows up in the iThink portal for the team to print a label. Tip: tick 3 or 4 and use "Send selected" first, then check them in the portal.',
      confirmLabel: `Send ${ready}`,
    });
    if (!ok) return;
    setBusy(true);
    let totals: SendTotals = { booked: 0, failed: 0, unsure: 0 };
    setProgress(0);
    for (;;) {
      const result = await post("/api/insiders/cards/send", { max: 10 });
      if (!result.ok) {
        toast(
          result.error ?? "Sending stopped. Press send again to carry on.",
          "error",
        );
        break;
      }
      totals = add(totals, result);
      setProgress(totals.booked + totals.failed + totals.unsure);
      const handled =
        Number(result.booked) + Number(result.failed) + Number(result.unsure);
      if (Number(result.remaining) === 0 || handled === 0) break;
    }
    setBusy(false);
    setProgress(null);
    const summary = sendSummary(totals);
    toast(summary.text, summary.good ? "success" : "error");
    router.refresh();
  }

  return (
    <AdminButton type="button" onClick={sendAll} disabled={busy || ready === 0}>
      {busy
        ? `Sending... ${progress ?? 0} of ${ready}`
        : `Send all ${ready} to iThink`}
    </AdminButton>
  );
}

/** Asks iThink about every card on its way, 50 per request. */
export function UpdateAllButton() {
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
      const result = await post("/api/insiders/cards/refresh", { startedAt });
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
          ? "No cards on their way right now."
          : `Checked ${total} ${total === 1 ? "card" : "cards"}, ${changed} moved on.`,
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
      {busy ? `Updating... ${checked}` : "Update all from iThink"}
    </AdminButton>
  );
}

/** Envelope size and weight sent with each card. */
export function EnvelopeButton({
  initial,
}: {
  initial: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    weightKg: number;
    declaredValue: number;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const start = {
    lengthCm: String(initial.lengthCm),
    heightCm: String(initial.heightCm),
    widthCm: String(initial.widthCm),
    weightGrams: String(Math.round(initial.weightKg * 1000)),
    declaredValue: String(initial.declaredValue),
  };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(start);
  const [baseline, setBaseline] = useState(start);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(values) !== JSON.stringify(baseline);

  async function save() {
    setSaving(true);
    const result = await post(
      "/api/insiders/cards/settings",
      {
        lengthCm: Number(values.lengthCm),
        heightCm: Number(values.heightCm),
        widthCm: Number(values.widthCm),
        weightKg: Number(values.weightGrams) / 1000,
        declaredValue: Number(values.declaredValue),
      },
      "PATCH",
    );
    setSaving(false);
    if (!result.ok) {
      toast(
        result.error ?? "Couldn't save. Check the numbers and try again.",
        "error",
      );
      return;
    }
    setBaseline(values);
    setOpen(false);
    toast("Envelope saved. New sends use it.", "success");
    router.refresh();
  }

  const field = (key: keyof typeof start, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <AdminInput
        type="number"
        step="any"
        min={0}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <>
      <AdminButton
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Change
      </AdminButton>
      <AdminDialog
        open={open}
        onClose={() => {
          setValues(baseline);
          setOpen(false);
        }}
        title="Insider card envelope"
        description="Sent to iThink with each card so the courier can price it. Cards already sent keep the old size."
        size="sm"
      >
        <div className="grid grid-cols-2 gap-3">
          {field("lengthCm", "Length (cm)")}
          {field("heightCm", "Height (cm)")}
          {field(
            "widthCm",
            "Thickness (cm)",
            "1 cm is the smallest couriers take.",
          )}
          {field("weightGrams", "Weight (grams)")}
          {field(
            "declaredValue",
            "Value on the parcel (₹)",
            "The card is free; a small value is fine.",
          )}
        </div>
        <div className="flex justify-end">
          <AdminButton
            type="button"
            onClick={save}
            disabled={!changed || saving}
          >
            {saving ? "Saving..." : "Save"}
          </AdminButton>
        </div>
      </AdminDialog>
    </>
  );
}

function StatusCell({ row }: { row: CardShipRowData }) {
  const s = row.shipment;
  if (!s || s.status === "CANCELLED") {
    if (row.postedOn) {
      return (
        <AdminBadge tone="success">Posted by hand {row.postedOn}</AdminBadge>
      );
    }
    return s ? (
      <AdminBadge tone="pending">Cancelled, not sent</AdminBadge>
    ) : (
      <AdminBadge tone="pending">Not sent</AdminBadge>
    );
  }
  const status = STATUS[s.status];
  return (
    <div className="flex max-w-[22rem] flex-col gap-1 whitespace-normal">
      <span>
        <AdminBadge tone={s.unsure ? "problem" : status.tone}>
          {s.unsure ? "No reply from iThink" : status.label}
          {s.status === "DELIVERED" && s.deliveredOn ? ` ${s.deliveredOn}` : ""}
        </AdminBadge>
      </span>
      {s.addressChanged ? (
        <span className="text-xs text-onwei-blue">
          The member changed their address after this was booked. Cancel and
          send again, or keep it if the change doesn&apos;t matter.
        </span>
      ) : null}
      {s.error ? (
        <span className="text-xs text-onwei-blue">{s.error}</span>
      ) : null}
      {s.courierStatus ? (
        <span className="text-xs text-onwei-blue/70">
          iThink says: {s.courierStatus}
          {s.checkedOn ? ` (checked ${s.checkedOn})` : ""}
        </span>
      ) : null}
    </div>
  );
}

function TrackingCell({ row }: { row: CardShipRowData }) {
  const s = row.shipment;
  if (!s || !s.awb || s.status === "CANCELLED" || s.status === "FAILED")
    return <>-</>;
  return (
    <div className="flex flex-col gap-0.5">
      <CopyText
        label="tracking number"
        text={s.awb}
        className="max-w-[12rem]"
      />
      <span className="text-xs text-onwei-blue/70">
        {s.courier ?? "Courier not known yet"}
        {s.trackingUrl ? (
          <>
            {" · "}
            <a
              href={s.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Track
            </a>
          </>
        ) : null}
      </span>
    </div>
  );
}

function RowActions({
  row,
  canSend,
  states,
}: {
  row: CardShipRowData;
  canSend: boolean;
  states: string[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const s = row.shipment;
  const status = s?.status;

  async function run(
    url: string,
    body: unknown,
    done: string,
    method = "POST",
  ): Promise<void> {
    setBusy(true);
    const result = await post(url, body, method);
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? "That didn't work. Try again.", "error");
      return;
    }
    if (url.endsWith("/send")) {
      const summary = sendSummary(
        add({ booked: 0, failed: 0, unsure: 0 }, result),
      );
      toast(summary.text, summary.good ? "success" : "error");
    } else {
      toast(done, "success");
    }
    router.refresh();
  }

  const sendAgain = (label: string) =>
    canSend ? (
      <AdminButton
        type="button"
        disabled={busy}
        onClick={() =>
          run("/api/insiders/cards/send", { addressIds: [row.id] }, "")
        }
      >
        {label}
      </AdminButton>
    ) : null;

  async function cancel() {
    const ok = await confirm({
      title: `Cancel ${row.name}'s card booking?`,
      message:
        'The booking is cancelled on iThink and the card goes back to "Ready to send". If a label was already printed, throw it away.',
      confirmLabel: "Cancel booking",
      danger: true,
    });
    if (ok)
      await run(
        `/api/insiders/cards/${row.id}/cancel`,
        undefined,
        "Booking cancelled.",
      );
  }

  const handPosted = (
    <AdminButton
      type="button"
      variant="secondary"
      disabled={busy}
      onClick={() =>
        run(
          `/api/insiders/addresses/${row.id}`,
          { posted: true },
          "Marked posted by hand.",
          "PATCH",
        )
      }
    >
      Posted by hand
    </AdminButton>
  );

  const buttons: React.ReactNode[] = [];
  if (!s || status === "CANCELLED") {
    if (row.postedOn) {
      buttons.push(
        <AdminButton
          key="undo"
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(
              `/api/insiders/addresses/${row.id}`,
              { posted: false },
              "Undone.",
              "PATCH",
            )
          }
        >
          Undo posted
        </AdminButton>,
      );
    } else if (row.cardNumber !== null) {
      buttons.push(<span key="hand">{handPosted}</span>);
    }
  } else if (status === "SENDING") {
    buttons.push(<span key="check">{sendAgain("Check again")}</span>);
  } else if (status === "BOOKED") {
    buttons.push(
      <AdminButton
        key="cancel"
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={cancel}
      >
        Cancel booking
      </AdminButton>,
    );
    if (s.addressChanged) {
      buttons.push(
        <AdminButton
          key="keep"
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(
              `/api/insiders/cards/${row.id}/keep`,
              undefined,
              "Kept as booked.",
            )
          }
        >
          Keep as is
        </AdminButton>,
      );
    }
  } else if (
    status === "FAILED" ||
    status === "RETURNED" ||
    status === "LOST"
  ) {
    buttons.push(<span key="again">{sendAgain("Send again")}</span>);
    buttons.push(<span key="hand">{handPosted}</span>);
  }
  // Edit address: ready to send, and every "Needs a look" case.
  const editable =
    (!s || status === "CANCELLED"
      ? !row.postedOn
      : status === "FAILED" ||
        status === "RETURNED" ||
        status === "LOST" ||
        status === "RETURNING" ||
        status === "SENDING" ||
        (status === "BOOKED" && s.addressChanged)) &&
    // A card still sending is only editable once iThink has answered.
    !(status === "SENDING" && !s?.unsure);
  if (editable) {
    buttons.push(
      <EditAddressButton
        key="edit"
        row={row}
        states={states}
        canSend={canSend}
      />,
    );
  }
  if (buttons.length === 0) return null;
  return <div className="flex flex-wrap gap-2">{buttons}</div>;
}

export function CardShipTable({
  rows,
  view,
  canManage,
  canSend,
  states,
}: {
  rows: CardShipRowData[];
  view: "ready" | "sent" | "problem" | "noCard";
  canManage: boolean;
  canSend: boolean;
  /** Indian states, for the Edit address popup's dropdown. */
  states: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const selectable = view === "ready" && canManage && canSend;
  const allPicked = picked.length === rows.length && rows.length > 0;

  async function sendPicked() {
    setSending(true);
    let totals: SendTotals = { booked: 0, failed: 0, unsure: 0 };
    for (let i = 0; i < picked.length; i += 10) {
      const result = await post("/api/insiders/cards/send", {
        addressIds: picked.slice(i, i + 10),
      });
      if (!result.ok) {
        toast(result.error ?? "Sending stopped. Try again.", "error");
        break;
      }
      totals = add(totals, result);
    }
    setSending(false);
    setPicked([]);
    const summary = sendSummary(totals);
    toast(summary.text, summary.good ? "success" : "error");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {selectable ? (
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton
            type="button"
            onClick={sendPicked}
            disabled={sending || picked.length === 0}
          >
            {sending ? "Sending..." : `Send selected (${picked.length})`}
          </AdminButton>
          <span className="text-sm text-onwei-blue/70">
            Tick a few to try first, then check them in the iThink portal.
          </span>
        </div>
      ) : null}
      <AdminTable>
        <AdminTableHead>
          {selectable ? (
            <AdminTableHeaderCell>
              <input
                type="checkbox"
                aria-label="Select everyone on this page"
                checked={allPicked}
                onChange={() =>
                  setPicked(allPicked ? [] : rows.map((r) => r.id))
                }
              />
            </AdminTableHeaderCell>
          ) : null}
          <AdminTableHeaderCell>Card no.</AdminTableHeaderCell>
          <AdminTableHeaderCell>Name</AdminTableHeaderCell>
          <AdminTableHeaderCell>Address</AdminTableHeaderCell>
          <AdminTableHeaderCell>Status</AdminTableHeaderCell>
          <AdminTableHeaderCell>Tracking</AdminTableHeaderCell>
          {canManage ? <AdminTableHeaderCell>{""}</AdminTableHeaderCell> : null}
        </AdminTableHead>
        <tbody>
          {rows.map((row) => (
            <AdminTableRow key={row.id}>
              {selectable ? (
                <AdminTableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name}`}
                    checked={picked.includes(row.id)}
                    onChange={() =>
                      setPicked(
                        picked.includes(row.id)
                          ? picked.filter((id) => id !== row.id)
                          : [...picked, row.id],
                      )
                    }
                  />
                </AdminTableCell>
              ) : null}
              <AdminTableCell>{row.cardNumber ?? "Not printed"}</AdminTableCell>
              <AdminTableCell>{row.name}</AdminTableCell>
              <AdminTableCell>
                <CopyText
                  label="address"
                  text={row.addressFull}
                  display={row.addressShort}
                />
              </AdminTableCell>
              <AdminTableCell>
                <StatusCell row={row} />
              </AdminTableCell>
              <AdminTableCell>
                <TrackingCell row={row} />
              </AdminTableCell>
              {canManage ? (
                <AdminTableCell>
                  <RowActions row={row} canSend={canSend} states={states} />
                </AdminTableCell>
              ) : null}
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}
