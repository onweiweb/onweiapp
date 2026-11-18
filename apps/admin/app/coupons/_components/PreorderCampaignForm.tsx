"use client";

import type { PreorderCampaignInput } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  name: string;
  stock: number;
  giftOnly: boolean;
}

type Errors = Record<string, string | undefined>;

const DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_CAMPAIGN = (today: string): PreorderCampaignInput => ({
  name: "Launch pre-order",
  isActive: false,
  startDate: today,
  reserveAmount: 900,
  expectedShipDate: null,
  productIds: [],
  insiderGiftVariantId: null,
  tiers: [
    {
      label: "Tier 1",
      days: 7,
      percent: 15,
      giftVariantId: null,
      giftLabel: "₹1,000 mystery box",
    },
    {
      label: "Tier 2",
      days: 7,
      percent: 10,
      giftVariantId: null,
      giftLabel: "₹500 mystery box",
    },
    {
      label: "Tier 3",
      days: 7,
      percent: 8,
      giftVariantId: null,
      giftLabel: "₹250 mystery box",
    },
  ],
});

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
          {o.giftOnly ? " (gift only)" : ""} · {o.stock} in stock
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
  canManage,
}: {
  campaignId: string | null;
  initial: PreorderCampaignInput;
  products: { id: string; name: string }[];
  gifts: GiftOption[];
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
              Customers pay the amount below per item now, and the rest when
              it&apos;s ready to ship.
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
            label="Paid now, per item (₹)"
            hint="Never more than the item costs after discounts."
            error={errors.reserveAmount}
          >
            <AdminInput
              type="number"
              min={1}
              value={form.reserveAmount}
              disabled={disabled}
              onChange={(e) => set("reserveAmount", Number(e.target.value))}
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
          <h2 className="text-lg font-semibold text-onwei-blue">Tiers</h2>
          <p className="text-sm text-onwei-blue/70">
            They run one after another. Change a tier&apos;s days to make it
            longer or shorter; the later tiers move with it. Reservations
            already paid keep their tier.
          </p>
        </div>
        {errors.tiers ? (
          <p className="text-sm text-onwei-black">{errors.tiers}</p>
        ) : null}
        {form.tiers.map((tier, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-[20px] border border-onwei-blue/15 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-onwei-blue">
                {tier.label || `Tier ${index + 1}`}{" "}
                <span className="text-sm font-normal text-onwei-blue/60">
                  {windows[index]}
                </span>
              </p>
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
            <div className="grid gap-3 md:grid-cols-[1fr_8rem_8rem]">
              <Field label="Name">
                <AdminInput
                  value={tier.label}
                  disabled={disabled}
                  onChange={(e) => setTier(index, { label: e.target.value })}
                />
              </Field>
              <Field label="Days">
                <AdminInput
                  type="number"
                  min={1}
                  value={tier.days}
                  disabled={disabled}
                  onChange={(e) =>
                    setTier(index, { days: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Discount (%)">
                <AdminInput
                  type="number"
                  min={0}
                  max={90}
                  value={tier.percent}
                  disabled={disabled}
                  onChange={(e) =>
                    setTier(index, { percent: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Free gift (one per item)"
                hint="Usually a mystery box product marked gift only."
              >
                <GiftSelect
                  value={tier.giftVariantId}
                  options={gifts}
                  onChange={(id) => setTier(index, { giftVariantId: id })}
                />
              </Field>
              <Field label="What customers see it called">
                <AdminInput
                  value={tier.giftLabel ?? ""}
                  placeholder="e.g. ₹1,000 mystery box"
                  disabled={disabled}
                  onChange={(e) =>
                    setTier(index, { giftLabel: e.target.value || null })
                  }
                />
              </Field>
            </div>
            {errors[`tier${index}`] ? (
              <p className="text-sm text-onwei-black">
                {errors[`tier${index}`]}
              </p>
            ) : null}
          </div>
        ))}
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
      </AdminCard>

      <AdminCard className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Insider extras
          </h2>
          <p className="text-sm text-onwei-blue/70">
            Insiders also get their Insider discount (see the Insider discount
            tab for how it adds up) and this gift, one per pre-order.
          </p>
        </div>
        <Field label="Insider gift">
          <GiftSelect
            value={form.insiderGiftVariantId}
            options={gifts}
            onChange={(id) => set("insiderGiftVariantId", id)}
          />
        </Field>
      </AdminCard>

      <AdminCard className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">
            Products on pre-order
          </h2>
          <p className="text-sm text-onwei-blue/70">
            {form.productIds.length} picked. There&apos;s no limit on how many
            can be reserved.
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
