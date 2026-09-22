"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput } from "./ui";

export function CouponForm({
  mode,
  couponId,
  initial,
}: {
  mode: "create" | "edit";
  couponId?: string;
  initial?: {
    code: string;
    description: string;
    usageLimit: string;
    perCustomerLimit: string;
    minOrderValue: string;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [usageLimit, setUsageLimit] = useState(initial?.usageLimit ?? "");
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    initial?.perCustomerLimit ?? "",
  );
  const [minOrderValue, setMinOrderValue] = useState(
    initial?.minOrderValue ?? "",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Enter a coupon code.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const payload = {
      code: code.trim(),
      description: description.trim() || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
      minOrderValue: minOrderValue ? Number(minOrderValue) : null,
      ...(mode === "edit" ? { isActive } : {}),
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/coupons" : `/api/coupons/${couponId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        coupon?: { id: string };
      };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      router.push(`/coupons/${mode === "create" ? data.coupon!.id : couponId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Code
        <AdminInput
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="SUMMER20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional, internal notes only)
        <AdminInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Max total uses (leave blank for unlimited)
        <AdminInput
          type="number"
          min={1}
          value={usageLimit}
          onChange={(event) => setUsageLimit(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Max uses per customer (leave blank for unlimited)
        <AdminInput
          type="number"
          min={1}
          value={perCustomerLimit}
          onChange={(event) => setPerCustomerLimit(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Minimum order value to qualify (leave blank for none)
        <AdminInput
          type="number"
          min={0}
          value={minOrderValue}
          onChange={(event) => setMinOrderValue(event.target.value)}
        />
      </label>
      {mode === "edit" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active — customers can use this code
        </label>
      ) : null}
      {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
      <AdminButton type="submit" disabled={submitting} className="self-start">
        {submitting
          ? "Saving…"
          : mode === "create"
            ? "Create coupon"
            : "Save changes"}
      </AdminButton>
    </form>
  );
}
