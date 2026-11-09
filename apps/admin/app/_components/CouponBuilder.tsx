"use client";

import type { CouponDraft, DraftErrors } from "@onwei/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTextarea,
  Field,
  useConfirm,
  useToast,
} from "./ui";

type Give = CouponDraft["give"];
type GiveType = Give["type"];

const GIVE_OPTIONS: { type: GiveType; label: string; hint: string }[] = [
  { type: "PERCENTAGE", label: "% off", hint: "e.g. 10% off" },
  { type: "FLAT", label: "₹ off", hint: "e.g. ₹200 off" },
  {
    type: "BUY_X_GET_Y",
    label: "Buy X, get Y free",
    hint: "The cheapest items are free",
  },
  {
    type: "TIERED",
    label: "Spend more, save more",
    hint: "Bigger cart, bigger %",
  },
  {
    type: "FREE_SHIPPING",
    label: "Free delivery",
    hint: "Removes the delivery fee",
  },
];

function defaultGive(type: GiveType): Give {
  switch (type) {
    case "PERCENTAGE":
      return { type, percent: 10 };
    case "FLAT":
      return { type, amount: 200 };
    case "BUY_X_GET_Y":
      return { type, buyQty: 2, getQty: 1 };
    case "TIERED":
      return {
        type,
        tiers: [
          { minSubtotal: 2000, percent: 10 },
          { minSubtotal: 3500, percent: 15 },
        ],
      };
    case "FREE_SHIPPING":
      return { type };
  }
}

export const EMPTY_DRAFT: CouponDraft = {
  code: "",
  description: null,
  isActive: true,
  give: { type: "PERCENTAGE", percent: 10 },
  maxDiscount: null,
  scope: "CART",
  categoryIds: [],
  productIds: [],
  excludeSaleItems: false,
  audience: "EVERYONE",
  allowedContacts: [],
  minOrderValue: null,
  minItems: null,
  usageLimit: null,
  perCustomerLimit: 1,
  startsAt: null,
  endsAt: null,
  autoApply: false,
  combinableWithCoupons: false,
  combinableWithInsider: false,
  prepaidOnly: false,
  priority: 0,
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-onwei-blue">{title}</h2>
        {hint ? <p className="text-sm text-onwei-blue/70">{hint}</p> : null}
      </div>
      {children}
    </AdminCard>
  );
}

function Radio<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
  hint,
  disabled,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${current === value ? "border-onwei-blue bg-onwei-beige" : "border-onwei-blue/20"} ${disabled ? "opacity-60" : ""}`}
    >
      <input
        type="radio"
        name={name}
        checked={current === value}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5"
      />
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-onwei-blue/70">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-2 text-sm ${disabled ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        {label}
        {hint ? (
          <span className="block text-xs text-onwei-blue/70">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function PickList({
  items,
  selected,
  onChange,
  disabled,
  placeholder,
}: {
  items: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const shown = items
    .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 60);
  return (
    <div className="flex flex-col gap-2">
      <AdminInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="max-h-56 overflow-y-auto rounded-lg border border-onwei-blue/20 p-2">
        {shown.map((item) => (
          <label key={item.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(item.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, item.id]
                    : selected.filter((id) => id !== item.id),
                )
              }
            />
            {item.name}
          </label>
        ))}
        {shown.length === 0 ? (
          <p className="text-sm text-onwei-blue/60">Nothing matches.</p>
        ) : null}
      </div>
      <p className="text-xs text-onwei-blue/70">{selected.length} picked</p>
    </div>
  );
}

export function CouponBuilder({
  couponId,
  initial,
  locked,
  uses,
  categories,
  products,
}: {
  couponId?: string;
  initial: CouponDraft;
  locked: boolean;
  uses?: { confirmed: number; held: number };
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<CouponDraft>(initial);
  const [contactsText, setContactsText] = useState(
    initial.allowedContacts.join("\n"),
  );
  const [baseline, setBaseline] = useState(
    JSON.stringify({
      ...initial,
      contacts: initial.allowedContacts.join("\n"),
    }),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [sample, setSample] = useState({ cartValue: 2400, items: 2 });
  const [preview, setPreview] = useState<{
    discount: number;
    freeShipping: boolean;
    reason: string | null;
  } | null>(null);

  const full = useMemo(
    () => ({
      ...draft,
      allowedContacts: contactsText
        .split(/[\n,]/)
        .map((c) => c.trim())
        .filter(Boolean),
    }),
    [draft, contactsText],
  );
  const dirty =
    JSON.stringify({ ...draft, contacts: contactsText }) !== baseline;

  function set<K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({
      ...e,
      [key]: undefined,
      ...(key === "give" ? { giveValue: undefined } : {}),
    }));
  }

  // Live preview, worked out on the server by the checkout engine.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/coupons/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: full, ...sample }),
      })
        .then(
          (r) =>
            r.json() as Promise<{
              ok: boolean;
              discount: number;
              freeShipping: boolean;
              reason: string | null;
            }>,
        )
        .then((data) => setPreview(data.ok ? data : null))
        .catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [full, sample]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(
      couponId ? `/api/coupons/${couponId}/builder` : "/api/coupons/builder",
      {
        method: couponId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full),
      },
    ).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      id?: string;
      errors?: DraftErrors;
      error?: string;
    } | null;
    setSaving(false);
    if (!data?.ok) {
      setErrors(data?.errors ?? {});
      toast(
        data?.error ??
          "Some details need a look. Check the highlighted fields.",
        "error",
      );
      return;
    }
    toast(couponId ? "Coupon saved." : "Coupon created.", "success");
    if (!couponId && data.id) {
      router.push(`/coupons/${data.id}`);
      return;
    }
    setBaseline(JSON.stringify({ ...draft, contacts: contactsText }));
    router.refresh();
  }

  async function duplicate() {
    const response = await fetch(`/api/coupons/${couponId}/duplicate`, {
      method: "POST",
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      id?: string;
      error?: string;
    } | null;
    if (!data?.ok || !data.id)
      return toast(data?.error ?? "Couldn't copy it.", "error");
    toast("Copy made. It starts switched off.", "success");
    router.push(`/coupons/${data.id}`);
  }

  async function toggleActive() {
    const next = !draft.isActive;
    if (
      !next &&
      !(await confirm({
        title: "Switch this coupon off?",
        message:
          "Customers can't use it from now on. Orders already placed keep their discount.",
        confirmLabel: "Switch off",
      }))
    )
      return;
    const response = await fetch(`/api/coupons/${couponId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    }).catch(() => null);
    if (!response?.ok) return toast("That didn't work. Try again.", "error");
    setDraft((d) => ({ ...d, isActive: next }));
    setBaseline((b) => JSON.stringify({ ...JSON.parse(b), isActive: next }));
    toast(next ? "Switched on." : "Switched off.", "success");
    router.refresh();
  }

  const give = draft.give;
  const showMax =
    give.type === "PERCENTAGE" ||
    give.type === "TIERED" ||
    give.type === "BUY_X_GET_Y";

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-6">
        {locked ? (
          <AdminCard className="border-2 border-onwei-blue">
            <p className="text-sm">
              This coupon has been used{" "}
              {uses
                ? `${uses.confirmed + uses.held} time${uses.confirmed + uses.held === 1 ? "" : "s"}`
                : ""}
              , so the deal is locked: what it gives, its maximum, what it
              applies to and how it combines. You can still change the dates,
              limits, description and who can use it. To change the deal,
              duplicate it.
            </p>
          </AdminCard>
        ) : null}

        <Section title="The code">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Code customers type"
              error={errors.code}
              hint="Letters, numbers and dashes. Not case sensitive."
            >
              <AdminInput
                value={draft.code}
                disabled={locked}
                onChange={(e) =>
                  set("code", e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                placeholder="e.g. WELCOME10"
              />
            </Field>
            <Field
              label="Name shown at checkout (optional)"
              hint='e.g. "Welcome 10% off". Leave empty to show the code.'
            >
              <AdminInput
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
              />
            </Field>
          </div>
        </Section>

        <Section title="What does the customer get?">
          <div className="grid gap-2 md:grid-cols-3">
            {GIVE_OPTIONS.map((o) => (
              <Radio
                key={o.type}
                name="give"
                value={o.type}
                current={give.type}
                label={o.label}
                hint={o.hint}
                disabled={locked}
                onChange={(t) => set("give", defaultGive(t))}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {give.type === "PERCENTAGE" ? (
              <Field
                label="Percent off"
                error={errors.giveValue}
                className="w-40"
              >
                <AdminInput
                  type="number"
                  min={1}
                  max={90}
                  disabled={locked}
                  value={give.percent}
                  onChange={(e) =>
                    set("give", { ...give, percent: Number(e.target.value) })
                  }
                />
              </Field>
            ) : null}
            {give.type === "FLAT" ? (
              <Field
                label="Amount off (₹)"
                error={errors.giveValue}
                className="w-40"
              >
                <AdminInput
                  type="number"
                  min={1}
                  disabled={locked}
                  value={give.amount}
                  onChange={(e) =>
                    set("give", { ...give, amount: Number(e.target.value) })
                  }
                />
              </Field>
            ) : null}
            {give.type === "BUY_X_GET_Y" ? (
              <>
                <Field label="Buy" error={errors.giveValue} className="w-32">
                  <AdminInput
                    type="number"
                    min={1}
                    disabled={locked}
                    value={give.buyQty}
                    onChange={(e) =>
                      set("give", { ...give, buyQty: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Get free" className="w-32">
                  <AdminInput
                    type="number"
                    min={1}
                    disabled={locked}
                    value={give.getQty}
                    onChange={(e) =>
                      set("give", { ...give, getQty: Number(e.target.value) })
                    }
                  />
                </Field>
              </>
            ) : null}
            {give.type === "TIERED" ? (
              <div className="flex w-full flex-col gap-2">
                {give.tiers.map((tier, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3">
                    <Field
                      label={`Step ${index + 1}: cart of at least (₹)`}
                      className="w-56"
                    >
                      <AdminInput
                        type="number"
                        min={1}
                        disabled={locked}
                        value={tier.minSubtotal}
                        onChange={(e) =>
                          set("give", {
                            ...give,
                            tiers: give.tiers.map((t, i) =>
                              i === index
                                ? { ...t, minSubtotal: Number(e.target.value) }
                                : t,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="gets % off" className="w-32">
                      <AdminInput
                        type="number"
                        min={1}
                        max={90}
                        disabled={locked}
                        value={tier.percent}
                        onChange={(e) =>
                          set("give", {
                            ...give,
                            tiers: give.tiers.map((t, i) =>
                              i === index
                                ? { ...t, percent: Number(e.target.value) }
                                : t,
                            ),
                          })
                        }
                      />
                    </Field>
                    {give.tiers.length > 1 && !locked ? (
                      <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          set("give", {
                            ...give,
                            tiers: give.tiers.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remove
                      </AdminButton>
                    ) : null}
                  </div>
                ))}
                {give.tiers.length < 5 && !locked ? (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    className="w-fit"
                    onClick={() =>
                      set("give", {
                        ...give,
                        tiers: [
                          ...give.tiers,
                          {
                            minSubtotal:
                              (give.tiers.at(-1)?.minSubtotal ?? 1000) + 1000,
                            percent: (give.tiers.at(-1)?.percent ?? 5) + 5,
                          },
                        ],
                      })
                    }
                  >
                    Add a step
                  </AdminButton>
                ) : null}
                {errors.giveValue ? (
                  <p className="text-xs text-onwei-black">{errors.giveValue}</p>
                ) : null}
              </div>
            ) : null}
            {showMax ? (
              <Field
                label="Maximum discount per order (₹)"
                hint="Leave empty for no maximum."
                error={errors.maxDiscount}
                className="w-60"
              >
                <AdminInput
                  type="number"
                  min={1}
                  disabled={locked}
                  value={draft.maxDiscount ?? ""}
                  onChange={(e) => set("maxDiscount", num(e.target.value))}
                />
              </Field>
            ) : null}
          </div>
        </Section>

        <Section title="On what?">
          <div className="grid gap-2 md:grid-cols-3">
            <Radio
              name="scope"
              value="CART"
              current={draft.scope}
              label="The whole cart"
              disabled={locked}
              onChange={(v) => set("scope", v)}
            />
            <Radio
              name="scope"
              value="CATEGORIES"
              current={draft.scope}
              label="Chosen categories"
              disabled={locked}
              onChange={(v) => set("scope", v)}
            />
            <Radio
              name="scope"
              value="PRODUCTS"
              current={draft.scope}
              label="Chosen products"
              disabled={locked}
              onChange={(v) => set("scope", v)}
            />
          </div>
          {draft.scope === "CATEGORIES" ? (
            <Field label="Categories" error={errors.categoryIds}>
              <PickList
                items={categories}
                selected={draft.categoryIds}
                disabled={locked}
                placeholder="Search categories"
                onChange={(ids) => set("categoryIds", ids)}
              />
            </Field>
          ) : null}
          {draft.scope === "PRODUCTS" ? (
            <Field label="Products" error={errors.productIds}>
              <PickList
                items={products}
                selected={draft.productIds}
                disabled={locked}
                placeholder="Search products"
                onChange={(ids) => set("productIds", ids)}
              />
            </Field>
          ) : null}
          <Check
            checked={draft.excludeSaleItems}
            disabled={locked}
            onChange={(v) => set("excludeSaleItems", v)}
            label="Don't apply to items already on sale"
          />
        </Section>

        <Section
          title="Who can use it?"
          hint="Codes for first orders, Insiders or chosen people need the customer to be signed in."
        >
          <div className="grid gap-2 md:grid-cols-2">
            <Radio
              name="audience"
              value="EVERYONE"
              current={draft.audience}
              label="Everyone"
              onChange={(v) => set("audience", v)}
            />
            <Radio
              name="audience"
              value="FIRST_ORDER"
              current={draft.audience}
              label="First order only"
              hint="No earlier order on the same email or phone."
              onChange={(v) => set("audience", v)}
            />
            <Radio
              name="audience"
              value="INSIDERS"
              current={draft.audience}
              label="Onwei Insiders only"
              onChange={(v) => set("audience", v)}
            />
            <Radio
              name="audience"
              value="SPECIFIC"
              current={draft.audience}
              label="Chosen people"
              hint="By email or phone number."
              onChange={(v) => set("audience", v)}
            />
          </div>
          {draft.audience === "SPECIFIC" ? (
            <Field
              label="Emails or phone numbers, one per line"
              error={errors.allowedContacts}
            >
              <AdminTextarea
                rows={4}
                value={contactsText}
                onChange={(e) => setContactsText(e.target.value)}
              />
            </Field>
          ) : null}
        </Section>

        <Section title="When does it apply?">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Minimum cart value (₹)"
              hint="Checked after other discounts. Empty for none."
              error={errors.minOrderValue}
            >
              <AdminInput
                type="number"
                min={1}
                value={draft.minOrderValue ?? ""}
                onChange={(e) => set("minOrderValue", num(e.target.value))}
              />
            </Field>
            <Field
              label="Minimum number of items"
              hint="Empty for none."
              error={errors.minItems}
            >
              <AdminInput
                type="number"
                min={1}
                value={draft.minItems ?? ""}
                onChange={(e) => set("minItems", num(e.target.value))}
              />
            </Field>
          </div>
        </Section>

        <Section title="How often?" hint="Dates and times are India time.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Total uses (everyone together)"
              hint="Empty for no limit."
              error={errors.usageLimit}
            >
              <AdminInput
                type="number"
                min={1}
                value={draft.usageLimit ?? ""}
                onChange={(e) => set("usageLimit", num(e.target.value))}
              />
            </Field>
            <Field
              label="Uses per customer"
              hint="Counted by email and phone, so a second account doesn't get more."
              error={errors.perCustomerLimit}
            >
              <AdminInput
                type="number"
                min={1}
                value={draft.perCustomerLimit ?? ""}
                onChange={(e) => set("perCustomerLimit", num(e.target.value))}
              />
            </Field>
            <Field
              label="Starts"
              hint="Empty to start now."
              error={errors.startsAt}
            >
              <AdminInput
                type="datetime-local"
                value={draft.startsAt ?? ""}
                onChange={(e) => set("startsAt", e.target.value || null)}
              />
            </Field>
            <Field
              label="Ends"
              hint="Empty for no end date."
              error={errors.endsAt}
            >
              <AdminInput
                type="datetime-local"
                value={draft.endsAt ?? ""}
                onChange={(e) => set("endsAt", e.target.value || null)}
              />
            </Field>
          </div>
        </Section>

        <Section title="How it works with everything else">
          <div className="grid gap-2 md:grid-cols-2">
            <Radio
              name="apply"
              value="code"
              current={draft.autoApply ? "auto" : "code"}
              label="Customer types the code"
              onChange={() => set("autoApply", false)}
            />
            <Radio
              name="apply"
              value="auto"
              current={draft.autoApply ? "auto" : "code"}
              label="Applies by itself"
              hint="When the cart meets the conditions. If several can't combine, the biggest saving wins."
              onChange={() => set("autoApply", true)}
            />
          </div>
          <Check
            checked={draft.combinableWithCoupons}
            disabled={locked}
            onChange={(v) => set("combinableWithCoupons", v)}
            label="Can be used together with other coupons"
            hint="Both coupons have to allow it."
          />
          <Check
            checked={draft.combinableWithInsider}
            disabled={locked}
            onChange={(v) => set("combinableWithInsider", v)}
            label="Can be used together with the Insider discount"
            hint="If not, the customer gets whichever saves them more."
          />
          <Check
            checked={draft.prepaidOnly}
            disabled={locked}
            onChange={(v) => set("prepaidOnly", v)}
            label="Online payment only (not cash on delivery)"
          />
          <Field
            label="Priority"
            hint="Higher numbers apply first when coupons stack. Most coupons can stay at 0."
            error={errors.priority}
            className="w-40"
          >
            <AdminInput
              type="number"
              min={-100}
              max={100}
              value={draft.priority}
              onChange={(e) => set("priority", Number(e.target.value))}
            />
          </Field>
        </Section>

        <div className="flex flex-wrap gap-3">
          <AdminButton
            type="submit"
            disabled={saving || (!!couponId && !dirty)}
          >
            {saving ? "Saving..." : couponId ? "Save changes" : "Create coupon"}
          </AdminButton>
          {couponId ? (
            <>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={toggleActive}
              >
                {draft.isActive ? "Switch off" : "Switch on"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="secondary"
                onClick={duplicate}
              >
                Duplicate
              </AdminButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <AdminCard className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-onwei-blue">Preview</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cart value (₹)">
              <AdminInput
                type="number"
                min={1}
                value={sample.cartValue}
                onChange={(e) =>
                  setSample((s) => ({
                    ...s,
                    cartValue: Number(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Items">
              <AdminInput
                type="number"
                min={1}
                max={50}
                value={sample.items}
                onChange={(e) =>
                  setSample((s) => ({
                    ...s,
                    items: Math.max(1, Number(e.target.value)),
                  }))
                }
              />
            </Field>
          </div>
          <p className="rounded-lg bg-onwei-beige p-3 text-sm">
            {preview === null
              ? "Working it out..."
              : preview.reason
                ? `A ₹${sample.cartValue.toLocaleString("en-IN")} cart wouldn't get this: ${preview.reason.toLowerCase()}.`
                : preview.freeShipping
                  ? `A ₹${sample.cartValue.toLocaleString("en-IN")} cart would get free delivery.`
                  : `A ₹${sample.cartValue.toLocaleString("en-IN")} cart with ${sample.items} item${sample.items === 1 ? "" : "s"} would get ₹${(preview.discount / 100).toLocaleString("en-IN")} off.`}
          </p>
          <p className="text-xs text-onwei-blue/60">
            Uses the same maths as checkout. Assumes every item qualifies and no
            other discounts.
          </p>
        </AdminCard>
      </div>
    </form>
  );
}
