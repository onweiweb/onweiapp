"use client";

import type { PreorderCampaignInput } from "@onwei/core";
import { insiderExtraText } from "@onwei/core/preorder-text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  Field,
  useConfirm,
  useToast,
} from "../../_components/ui";

export interface GiftOption {
  id: string;
  productId: string;
  name: string;
  stock: number;
  giftOnly: boolean;
  /** Paise: the item's price, which is what a box or gift is worth. */
  value: number;
}

/** The Insider discount tab's settings, shown in the journey table. */
export interface InsiderTerms {
  percent: number;
  mode: "ADD" | "BEST";
  /** Signup-date tiers give some Insiders a different %. */
  hasDatedTiers: boolean;
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

type Errors = Record<string, string | undefined>;

const DAY = 24 * 60 * 60 * 1000;

function shortDate(iso: string, plusDays: number): string {
  const time = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(time)) return "?";
  return new Date(time + plusDays * DAY).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function GiftSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: GiftOption[];
  onChange: (id: string | null) => void;
}) {
  return (
    <AdminSelect
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">No gift</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
          {o.giftOnly ? " (gift only)" : ""} · worth {rupees(o.value)} ·{" "}
          {o.stock} in stock
        </option>
      ))}
    </AdminSelect>
  );
}

export function PreorderCampaignForm({
  campaignId,
  initial,
  products,
  gifts,
  insiderTerms,
  canManage,
}: {
  campaignId: string | null;
  initial: PreorderCampaignInput;
  products: { id: string; name: string }[];
  gifts: GiftOption[];
  insiderTerms: InsiderTerms;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<PreorderCampaignInput>(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const dirty = JSON.stringify(form) !== baseline;

  function set<K extends keyof PreorderCampaignInput>(
    key: K,
    value: PreorderCampaignInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setTier(
    index: number,
    patch: Partial<PreorderCampaignInput["tiers"][number]>,
  ) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
    setErrors((e) => ({ ...e, [`tier${index}`]: undefined, tiers: undefined }));
  }

  const windows = useMemo(
    () =>
      form.tiers.map((_, index) => {
        const before = form.tiers
          .slice(0, index)
          .reduce((sum, t) => sum + (Number(t.days) || 0), 0);
        const end = before + (Number(form.tiers[index]!.days) || 0);
        return `${shortDate(form.startDate, before)} to ${shortDate(form.startDate, end - 1)}`;
      }),
    [form.startDate, form.tiers],
  );

  const shownProducts = products.filter(
    (p) =>
      form.productIds.includes(p.id) ||
      p.name.toLowerCase().includes(productQuery.trim().toLowerCase()),
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form.isActive && !JSON.parse(baseline).isActive) {
      const ok = await confirm({
        title: "Switch the pre-order on?",
        message:
          "Customers can reserve the chosen products straight away (once the site is in pre-order mode). Prices and gifts come from the live tier.",
        confirmLabel: "Switch on",
      });
      if (!ok) return;
    }
    setSaving(true);
    const response = await fetch(
      campaignId
        ? `/api/preorders/campaign/${campaignId}`
        : "/api/preorders/campaign",
      {
        method: campaignId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    ).catch(() => null);
    setSaving(false);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      errors?: Errors;
      error?: string;
    } | null;
    if (!response?.ok || !data?.ok) {
      setErrors(data?.errors ?? {});
      toast(
        data?.error ?? "Some things need fixing. See the notes below.",
        "error",
      );
      return;
    }
    setBaseline(JSON.stringify(form));
    toast("Pre-order saved.", "success");
    router.refresh();
  }

  const disabled = !canManage;
  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <AdminCard className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-onwei-blue">
              The basics
            </h2>
            <p className="text-sm text-onwei-blue/70">
              Customers pay a reserve today, worked out from their bag at full
              price, and the balance by the due date below.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-onwei-blue">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={disabled}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            Pre-order is on
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name (only staff see it)" error={errors.name}>
            <AdminInput
              value={form.name}
              disabled={disabled}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field
            label="First day"
            hint="Tier 1 starts at midnight, India time."
            error={errors.startDate}
          >
            <AdminInput
              type="date"
              value={form.startDate}
              disabled={disabled}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
          <Field
            label="Reserve for smaller bags (₹)"
            hint="Paid today when the bag is at or under the amount below, at full price before any discount."
            error={errors.reserveLow}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.reserveLow}
              disabled={disabled}
              onChange={(e) => set("reserveLow", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Bigger reserve starts above (₹)"
            hint="Bag total at full price. Example: ₹4,000."
            error={errors.reserveThreshold}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.reserveThreshold}
              disabled={disabled}
              onChange={(e) => set("reserveThreshold", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Reserve for bigger bags (₹)"
            hint="Paid today above that amount. Never more than the order costs."
            error={errors.reserveHigh}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.reserveHigh}
              disabled={disabled}
              onChange={(e) => set("reserveHigh", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Balance reminder, days before pre-orders close"
            hint="We remind everyone who hasn't paid the balance. After this they can't cancel."
            error={errors.nudgeDaysBeforeClose}
          >
            <AdminInput
              type="number"
              min={0}
              value={form.nudgeDaysBeforeClose}
              disabled={disabled}
              onChange={(e) =>
                set("nudgeDaysBeforeClose", Number(e.target.value))
              }
            />
          </Field>
          <Field
            label="Days to pay the balance after pre-orders close"
            hint="Unpaid after this: nothing ships, and the reserve becomes credit for a year."
            error={errors.balanceDueDaysAfterClose}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.balanceDueDaysAfterClose}
              disabled={disabled}
              onChange={(e) =>
                set("balanceDueDaysAfterClose", Number(e.target.value))
              }
            />
          </Field>
          <Field
            label="Expected to ship (optional)"
            hint="Shown to customers and in the confirmation email."
            error={errors.expectedShipDate}
          >
            <AdminInput
              type="date"
              value={form.expectedShipDate ?? ""}
              disabled={disabled}
              onChange={(e) => set("expectedShipDate", e.target.value || null)}
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Pre-order journey
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Tiers run one after another. Change a tier&apos;s days to make it
            longer or shorter; the later tiers move with it. Reservations
            already paid keep their tier.
          </p>
        </div>
        {errors.tiers ? (
          <p className="text-sm text-onwei-black">{errors.tiers}</p>
        ) : null}
        <div className="overflow-x-auto">
          <div className="grid min-w-[56rem] grid-cols-[minmax(10rem,1fr)_5rem_6rem_minmax(16rem,1.6fr)_minmax(13rem,1.1fr)_auto] gap-x-3 gap-y-2 text-sm">
            {[
              "Tier",
              "Days",
              "Discount %",
              "Mystery box (one per item)",
              "Insiders get",
              "",
            ].map((h, i) => (
              <p
                key={i}
                className="border-b border-onwei-blue/10 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-onwei-blue/70"
              >
                {h}
              </p>
            ))}
            {form.tiers.map((tier, index) => {
              const box = gifts.find((g) => g.id === tier.giftVariantId);
              const insiderGift = gifts.find(
                (g) => g.id === form.insiderGiftVariantId,
              );
              return (
                <div key={index} className="contents">
                  <div className="flex flex-col gap-1">
                    <AdminInput
                      aria-label="Tier name"
                      value={tier.label}
                      disabled={disabled}
                      onChange={(e) =>
                        setTier(index, { label: e.target.value })
                      }
                    />
                    <span className="text-xs text-onwei-blue/60">
                      {windows[index]}
                    </span>
                  </div>
                  <AdminInput
                    aria-label="Days"
                    type="number"
                    min={1}
                    value={tier.days}
                    disabled={disabled}
                    onChange={(e) =>
                      setTier(index, { days: Number(e.target.value) })
                    }
                  />
                  <AdminInput
                    aria-label="Discount %"
                    type="number"
                    min={0}
                    max={90}
                    value={tier.percent}
                    disabled={disabled}
                    onChange={(e) =>
                      setTier(index, { percent: Number(e.target.value) })
                    }
                  />
                  <div className="flex flex-col gap-1.5">
                    <GiftSelect
                      value={tier.giftVariantId}
                      options={gifts}
                      onChange={(id) => setTier(index, { giftVariantId: id })}
                    />
                    <AdminInput
                      aria-label="What customers see it called"
                      value={tier.giftLabel ?? ""}
                      placeholder="Called on the site, e.g. ₹1,000 mystery box"
                      disabled={disabled}
                      onChange={(e) =>
                        setTier(index, { giftLabel: e.target.value || null })
                      }
                    />
                    {box ? (
                      <span className="text-xs text-onwei-blue/60">
                        Worth {rupees(box.value)} · {box.stock} in stock
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-0.5 pt-2">
                    <span className="font-medium">
                      {insiderExtraText(
                        Number(tier.percent) || 0,
                        insiderTerms.percent,
                        insiderTerms.mode,
                      )}
                    </span>
                    {box ? (
                      <span className="text-xs text-onwei-blue/70">
                        + {tier.giftLabel || "mystery box"}
                      </span>
                    ) : null}
                    {insiderGift ? (
                      <span className="text-xs text-onwei-blue/70">
                        + Insider gift ({rupees(insiderGift.value)})
                      </span>
                    ) : null}
                  </div>
                  <div className="pt-1">
                    {canManage && form.tiers.length > 1 ? (
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          set(
                            "tiers",
                            form.tiers.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </AdminButton>
                    ) : null}
                  </div>
                  {errors[`tier${index}`] ? (
                    <p className="col-span-full text-sm text-onwei-black">
                      {errors[`tier${index}`]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {canManage && form.tiers.length < 5 ? (
          <AdminButton
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() =>
              set("tiers", [
                ...form.tiers,
                {
                  label: `Tier ${form.tiers.length + 1}`,
                  days: 7,
                  percent: 5,
                  giftVariantId: null,
                  giftLabel: null,
                },
              ])
            }
          >
            Add a tier
          </AdminButton>
        ) : null}

        <div className="grid gap-4 border-t border-onwei-blue/10 pt-4 md:grid-cols-2">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">Insider discount</p>
            <p className="text-onwei-blue/70">
              {insiderTerms.percent}% for Insiders,{" "}
              {insiderTerms.mode === "ADD"
                ? "added on top of the tier discount"
                : "or the tier discount if that's bigger (bigger one wins)"}
              .
              {insiderTerms.hasDatedTiers
                ? " Insiders who signed up in a dated tier get that tier's % instead."
                : ""}{" "}
              <Link href="/coupons?tab=insider" className="underline">
                Change it on the Insider discount tab
              </Link>
            </p>
          </div>
          <Field
            label="Insider gift (one per pre-order)"
            hint="Every Insider gets this on each pre-order, on top of the tier's mystery box."
          >
            <GiftSelect
              value={form.insiderGiftVariantId}
              options={gifts}
              onChange={(id) => set("insiderGiftVariantId", id)}
            />
          </Field>
        </div>

        <JourneyPreview
          items={gifts.filter((g) => !g.giftOnly)}
          productIds={form.productIds}
          tiers={form.tiers}
          reserve={{
            low: form.reserveLow,
            high: form.reserveHigh,
            threshold: form.reserveThreshold,
          }}
        />
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Products on pre-order
          </h2>
          <p className="text-sm text-onwei-blue/70">
            {form.productIds.length} picked. Pre-orders take what&apos;s in
            stock: each reservation holds its items, so add the planned quantity
            in Inventory before pre-orders open.
          </p>
        </div>
        {errors.productIds ? (
          <p className="text-sm text-onwei-black">{errors.productIds}</p>
        ) : null}
        <AdminInput
          placeholder="Search products"
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
        />
        <div className="grid max-h-72 gap-1 overflow-y-auto md:grid-cols-2">
          {shownProducts.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-sm text-onwei-blue"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.productIds.includes(p.id)}
                onChange={(e) =>
                  set(
                    "productIds",
                    e.target.checked
                      ? [...form.productIds, p.id]
                      : form.productIds.filter((id) => id !== p.id),
                  )
                }
              />
              {p.name}
            </label>
          ))}
        </div>
      </AdminCard>

      {canManage ? (
        <div className="flex gap-3">
          <AdminButton type="submit" disabled={saving || !dirty}>
            {saving
              ? "Saving..."
              : campaignId
                ? "Save changes"
                : "Create pre-order"}
          </AdminButton>
        </div>
      ) : null}
    </form>
  );
}

interface PreviewPrice {
  total: number;
  shippingFee: number;
  reserveTotal: number;
  balanceDue: number;
}

/**
 * "What a customer pays" for one product in each tier, priced by the same
 * engine as checkout with the form's tiers as typed (saved or not).
 */
function JourneyPreview({
  items,
  productIds,
  tiers,
  reserve,
}: {
  items: GiftOption[];
  /** Products on this pre-order: listed first, and the first one is picked. */
  productIds: string[];
  tiers: PreorderCampaignInput["tiers"];
  /** Rupees, from the form. */
  reserve: { low: number; high: number; threshold: number };
}) {
  const sorted = [
    ...items.filter((i) => productIds.includes(i.productId)),
    ...items.filter((i) => !productIds.includes(i.productId)),
  ];
  const [variantId, setVariantId] = useState(sorted[0]?.id ?? "");
  const [preview, setPreview] = useState<{
    price: number;
    tiers: { label: string; everyone: PreviewPrice; insider: PreviewPrice }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tierKey = JSON.stringify(
    tiers.map((t) => ({ label: t.label, percent: Number(t.percent) || 0 })),
  );

  useEffect(() => {
    if (!variantId) return;
    let live = true;
    const timer = setTimeout(() => {
      void (async () => {
        const response = await fetch("/api/preorders/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId,
            reserveLow: Number(reserve.low) || 0,
            reserveHigh: Number(reserve.high) || 0,
            reserveThreshold: Number(reserve.threshold) || 0,
            tiers: JSON.parse(tierKey),
          }),
        }).catch(() => null);
        const data = (await response?.json().catch(() => null)) as {
          ok: boolean;
          preview?: typeof preview;
          error?: string;
        } | null;
        if (!live) return;
        if (data?.ok && data.preview) {
          setPreview(data.preview);
          setError(null);
        } else {
          setError(data?.error ?? "Couldn't work out the prices just now.");
        }
      })();
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [variantId, reserve.low, reserve.high, reserve.threshold, tierKey]);

  if (items.length === 0) return null;

  const cell = "px-3 py-1.5";
  return (
    <div className="flex flex-col gap-3 border-t border-onwei-blue/10 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-medium text-onwei-blue">What a customer pays</p>
          <p className="text-xs text-onwei-blue/70">
            For one item, worked out the same way as checkout, delivery
            included. Updates as you change the tiers, before you save.
          </p>
        </div>
        <AdminSelect
          aria-label="Product"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {sorted.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </AdminSelect>
      </div>
      {error ? (
        <p className="text-sm text-onwei-black">{error}</p>
      ) : preview ? (
        <div className="overflow-x-auto rounded-[14px] border border-onwei-blue/10">
          <table className="w-full min-w-max text-[13px] tabular-nums">
            <thead>
              <tr className="bg-onwei-beige/40 text-left text-[11px] uppercase tracking-wide">
                <th className={`${cell} font-medium`}>Tier</th>
                <th className={`${cell} font-medium`}>Normal price</th>
                <th className={`${cell} font-medium`}>Everyone pays</th>
                <th className={`${cell} font-medium`}>Insiders pay</th>
                <th className={`${cell} font-medium`}>Delivery</th>
                <th className={`${cell} font-medium`}>Paid now</th>
                <th className={`${cell} font-medium`}>Balance later</th>
              </tr>
            </thead>
            <tbody>
              {preview.tiers.map((t, i) => (
                <tr key={i} className="border-t border-onwei-beige/60">
                  <td className={cell}>{t.label}</td>
                  <td className={cell}>{rupees(preview.price)}</td>
                  <td className={cell}>{rupees(t.everyone.total)}</td>
                  <td className={cell}>{rupees(t.insider.total)}</td>
                  <td className={cell}>
                    {t.everyone.shippingFee
                      ? rupees(t.everyone.shippingFee)
                      : "Free"}
                  </td>
                  <td className={cell}>
                    {rupees(t.everyone.reserveTotal)}
                    {t.insider.reserveTotal !== t.everyone.reserveTotal ? (
                      <span className="text-onwei-blue/60">
                        {" "}
                        (Insiders {rupees(t.insider.reserveTotal)})
                      </span>
                    ) : null}
                  </td>
                  <td className={cell}>
                    {rupees(t.everyone.balanceDue)}
                    <span className="text-onwei-blue/60">
                      {" "}
                      (Insiders {rupees(t.insider.balanceDue)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-onwei-blue/70">Working out prices...</p>
      )}
    </div>
  );
}
