"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, useConfirm, useToast } from "../../_components/ui";

/** Pause or resume a coupon. Orders already placed keep their discount. */
export async function setCouponPaused(
  couponId: string,
  pause: boolean,
  confirm: ReturnType<typeof useConfirm>,
): Promise<boolean | null> {
  if (
    pause &&
    !(await confirm({
      title: "Pause this coupon?",
      message:
        "Customers can't use it until you resume it. Orders already placed keep their discount.",
      confirmLabel: "Pause",
    }))
  )
    return null;
  const response = await fetch(`/api/coupons/${couponId}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: !pause }),
  }).catch(() => null);
  return Boolean(response?.ok);
}

/**
 * Deletes a never-used coupon. Used ones can't be deleted (orders point at
 * them); the server says so and the message suggests pausing instead.
 */
export async function removeCoupon(
  couponId: string,
  code: string,
  confirm: ReturnType<typeof useConfirm>,
): Promise<{ ok: boolean; error?: string } | null> {
  if (
    !(await confirm({
      title: `Delete ${code}?`,
      message:
        "The code stops working and is removed for good. You can't undo this. Codes already used on orders can only be paused.",
      confirmLabel: "Delete",
      danger: true,
    }))
  )
    return null;
  const response = await fetch(`/api/coupons/${couponId}`, {
    method: "DELETE",
  }).catch(() => null);
  const data = (await response?.json().catch(() => null)) as {
    ok: boolean;
    error?: string;
  } | null;
  return data ?? { ok: false };
}

export function CouponRowActions({
  couponId,
  code,
  isActive,
}: {
  couponId: string;
  code: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <AdminButton
        type="button"
        variant="secondary"
        disabled={busy}
        className="px-3 py-1 text-xs"
        onClick={async () => {
          setBusy(true);
          const ok = await setCouponPaused(couponId, isActive, confirm);
          setBusy(false);
          if (ok === null) return;
          if (!ok) return toast("That didn't work. Try again.", "error");
          toast(
            isActive ? `${code} paused.` : `${code} is live again.`,
            "success",
          );
          router.refresh();
        }}
      >
        {isActive ? "Pause" : "Resume"}
      </AdminButton>
      <AdminButton
        type="button"
        variant="secondary"
        disabled={busy}
        className="px-3 py-1 text-xs"
        onClick={async () => {
          setBusy(true);
          const result = await removeCoupon(couponId, code, confirm);
          setBusy(false);
          if (result === null) return;
          if (!result.ok)
            return toast(
              result.error ?? "That didn't work. Try again.",
              "error",
            );
          toast(`${code} deleted.`, "success");
          router.refresh();
        }}
      >
        Delete
      </AdminButton>
    </div>
  );
}
