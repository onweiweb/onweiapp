"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscountType } from "@onwei/database";
import { AdminButton, AdminInput, AdminSelect } from "./ui";
import { DISCOUNT_TYPE_LABELS } from "../_lib/discountLabels";

const TYPE_OPTIONS = Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[];

export function DiscountRuleForm({ couponId }: { couponId: string }) {
  const router = useRouter();
  const [type, setType] = useState<DiscountType>("PERCENTAGE");
  const [percentage, setPercentage] = useState("");
  const [amount, setAmount] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [getQty, setGetQty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function buildConfig(): Record<string, unknown> | null {
    if (type === "PERCENTAGE") {
      return percentage ? { percentage: Number(percentage) } : null;
    }
    if (type === "FLAT") {
      return amount ? { amount: Number(amount) } : null;
    }
    return buyQty && getQty
      ? { buyQty: Number(buyQty), getQty: Number(getQty) }
      : null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const config = buildConfig();
    if (!config) {
      setError("Fill in the details for this discount type.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/coupons/${couponId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setPercentage("");
      setAmount("");
      setBuyQty("");
      setGetQty("");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AdminSelect
          value={type}
          onChange={(event) => setType(event.target.value as DiscountType)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {DISCOUNT_TYPE_LABELS[option]}
            </option>
          ))}
        </AdminSelect>

        {type === "PERCENTAGE" ? (
          <AdminInput
            type="number"
            min={1}
            max={100}
            placeholder="% off"
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
            className="w-28"
          />
        ) : null}
        {type === "FLAT" ? (
          <AdminInput
            type="number"
            min={1}
            placeholder="₹ off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-28"
          />
        ) : null}
        {type === "BUY_X_GET_Y" ? (
          <>
            <AdminInput
              type="number"
              min={1}
              placeholder="Buy qty"
              value={buyQty}
              onChange={(event) => setBuyQty(event.target.value)}
              className="w-24"
            />
            <AdminInput
              type="number"
              min={1}
              placeholder="Get qty free"
              value={getQty}
              onChange={(event) => setGetQty(event.target.value)}
              className="w-28"
            />
          </>
        ) : null}

        <AdminButton type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add rule"}
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-onwei-black">{error}</p> : null}
    </form>
  );
}
