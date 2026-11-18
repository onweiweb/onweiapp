"use client";

import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminSelect,
  Field,
} from "../../_components/ui";

interface Discount {
  kind: "INSIDER" | "COUPON" | "PREORDER";
  label: string;
  amount: number;
  freeShipping: boolean;
  freeItem?: { itemLabel: string; quantity: number; available: boolean };
}

interface Result {
  ok: true;
  productName: string;
  insiderPercent: number;
  insiderMode: "ADD" | "BEST";
  tier: { label: string; percent: number } | null;
  pricing: {
    subtotal: number;
    discounts: Discount[];
    discountTotal: number;
    shippingFee: number;
    shippingSaved: number;
    total: number;
    insiderApplied: boolean;
    preorderApplied: boolean;
    rejected: {
      code: string;
      reason: string;
      blockedBy?: string;
      short?: number;
    }[];
  };
  reserve: { reserveTotal: number; balanceDue: number } | null;
  unknownCodes: string[];
  pausedCodes: string[];
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const WHY: Record<string, string> = {
  MIN_ORDER: "needs a bigger order",
  MIN_ITEMS: "needs more items",
  NO_ELIGIBLE_ITEMS: "doesn't cover this product",
  PREPAID_ONLY: "online payment only",
  NOT_WITH_INSIDER: "the Insider discount saves more (bigger one wins)",
  NOT_WITH_COUPON: "can't be used with another code here",
  NOT_FOR_PREORDERS: "isn't set to work on pre-orders",
  PREORDERS_ONLY: "only works on pre-orders",
  BETTER_OFFER: "another offer saves more",
};

/** "What would this customer pay?" Same maths as checkout. */
export function PriceChecker({
  items,
}: {
  items: { id: string; name: string }[];
}) {
  const [variantId, setVariantId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [insider, setInsider] = useState(true);
  const [preorder, setPreorder] = useState(false);
  const [codes, setCodes] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!variantId) return;
    const timer = setTimeout(() => {
      fetch("/api/discounts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity,
          insider,
          preorder,
          codes: codes
            .split(/[\s,]+/)
            .filter(Boolean)
            .slice(0, 5),
        }),
      })
        .then((r) => r.json() as Promise<Result | { ok: false; error: string }>)
        .then((data) => {
          if (data.ok) {
            setResult(data);
            setError(null);
          } else {
            setResult(null);
            setError(data.error);
          }
        })
        .catch(() => setError("Couldn't work it out. Try again."));
    }, 300);
    return () => clearTimeout(timer);
  }, [variantId, quantity, insider, preorder, codes]);

  const p = result?.pricing;
  return (
    <AdminCard className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-onwei-blue">Price checker</h2>
        <p className="text-sm text-onwei-blue/70">
          Try any product, with or without the Insider discount, as a normal
          order or a pre-order, with any codes. Uses the same maths as checkout.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_7rem]">
        <Field label="Product">
          <AdminSelect
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </AdminSelect>
        </Field>
        <Field label="How many">
          <AdminInput
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(1, Math.min(10, Number(e.target.value) || 1)),
              )
            }
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-onwei-blue">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={insider}
            onChange={(e) => setInsider(e.target.checked)}
          />
          Customer is an Insider
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={preorder}
            onChange={(e) => setPreorder(e.target.checked)}
          />
          Pre-order (live tier, or tier 1 before it starts)
        </label>
      </div>
      <Field
        label="Codes (optional)"
        hint="Separate with spaces. Paused or ended codes are tried too."
      >
        <AdminInput
          value={codes}
          placeholder="e.g. LAUNCH10 CR-7K2M9Q"
          onChange={(e) => setCodes(e.target.value)}
        />
      </Field>

      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      {result && p ? (
        <div className="rounded-[20px] border border-onwei-blue/20 p-4 text-sm text-onwei-blue">
          <Row
            label={`${result.productName} × ${quantity}`}
            value={rupees(p.subtotal)}
          />
          {p.discounts.map((d, i) =>
            d.freeItem ? (
              <Row
                key={i}
                label={`${d.freeItem.quantity} × ${d.freeItem.itemLabel} (${d.label})`}
                value={d.freeItem.available ? "Free" : "Out of stock, left out"}
              />
            ) : d.freeShipping ? (
              <Row key={i} label={d.label} value="Free delivery" />
            ) : (
              <Row key={i} label={d.label} value={`−${rupees(d.amount)}`} />
            ),
          )}
          <Row
            label="Delivery"
            value={p.shippingFee === 0 ? "Free" : rupees(p.shippingFee)}
          />
          <Row label="Customer pays" value={rupees(p.total)} bold />
          {result.reserve ? (
            <>
              <Row
                label="Paid now (reserve)"
                value={rupees(result.reserve.reserveTotal)}
              />
              <Row
                label="Paid when it's ready"
                value={rupees(result.reserve.balanceDue)}
              />
            </>
          ) : null}
          <ul className="mt-3 flex flex-col gap-1 text-onwei-blue/70">
            {insider && !p.insiderApplied ? (
              <li>
                Insider {result.insiderPercent}% not used: bigger one wins is
                on, and the other offer saves more.
              </li>
            ) : null}
            {preorder && result.tier && !p.preorderApplied ? (
              <li>
                {result.tier.label} discount not used: the Insider discount
                saves more.
              </li>
            ) : null}
            {p.rejected.map((r) => (
              <li key={r.code}>
                {r.code} left out: {WHY[r.reason] ?? "doesn't apply"}
                {r.blockedBy ? ` (${r.blockedBy})` : ""}.
              </li>
            ))}
            {result.unknownCodes.map((c) => (
              <li key={c}>{c}: no coupon with this code.</li>
            ))}
            {result.pausedCodes.map((c) => (
              <li key={c}>
                {c} is paused or outside its dates, so customers can&apos;t use
                it right now.
              </li>
            ))}
            <li>
              Insider discount works as:{" "}
              {result.insiderMode === "ADD" ? "add on top" : "bigger one wins"}.
            </li>
          </ul>
        </div>
      ) : null}
    </AdminCard>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 py-1 ${bold ? "font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}
