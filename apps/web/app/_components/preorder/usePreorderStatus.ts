"use client";

import type { PreorderPublicStatus } from "@onwei/core";
import { useEffect, useState } from "react";

// One request per page load, shared by the banner, pop-up and Reserve
// buttons. Null until it has loaded (nothing pre-order shows until then).
let pending: Promise<PreorderPublicStatus | null> | null = null;

const NOT_LIVE: PreorderPublicStatus = {
  state: "LIVE",
  live: false,
  opensAt: null,
  reserveLow: 0,
  reserveHigh: 0,
  reserveThreshold: 0,
  balanceDueBy: null,
  productIds: [],
  tiers: [],
  liveIndex: -1,
  day: 0,
  totalDays: 0,
  endsAt: null,
  expectedShipDate: null,
};

function load(): Promise<PreorderPublicStatus | null> {
  // A failed request counts as "not live" so the normal pop-up still shows.
  pending ??= fetch("/api/preorder/status")
    .then((r) =>
      r.ok ? (r.json() as Promise<PreorderPublicStatus>) : NOT_LIVE,
    )
    .catch(() => NOT_LIVE);
  return pending;
}

export function usePreorderStatus(): PreorderPublicStatus | null {
  const [status, setStatus] = useState<PreorderPublicStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void load().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

/** True when this product can be reserved right now. */
export function isOnPreorder(
  status: PreorderPublicStatus | null,
  productId: string | undefined,
): boolean {
  return Boolean(
    status?.live && productId && status.productIds.includes(productId),
  );
}

/**
 * What a product's buy button does right now. LOADING until the status is
 * known, so a click can never land in the wrong mode.
 * - SHOP: normal add to bag.
 * - RESERVE: pre-order is open for this product: it goes in the bag and
 *   checkout charges the reserve.
 * - SOON / CLOSED: on the campaign, but no lap is running.
 * - LAUNCH: pre-order mode, not on the campaign: waits for launch.
 */
export type BuyMode =
  "LOADING" | "SHOP" | "RESERVE" | "SOON" | "CLOSED" | "LAUNCH";

export function buyModeFor(
  status: PreorderPublicStatus | null,
  productId: string | undefined,
): BuyMode {
  if (!status) return "LOADING";
  if (!status.state.startsWith("PREORDER_")) return "SHOP";
  const onCampaign = Boolean(
    productId && status.productIds.includes(productId),
  );
  if (!onCampaign) return "LAUNCH";
  if (status.state === "PREORDER_OPEN") return "RESERVE";
  if (status.state === "PREORDER_SOON") return "SOON";
  return "CLOSED";
}

/** Button and note text for the modes that can't buy or reserve. */
export function waitingCopy(
  mode: "SOON" | "CLOSED" | "LAUNCH",
  opensAt: string | null,
): { button: string; note: string } {
  if (mode === "SOON") {
    const date = opensAt
      ? new Date(opensAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: "Asia/Kolkata",
        })
      : null;
    return {
      button: date ? `pre-orders open ${date}` : "pre-orders open soon",
      note: "You can reserve this as soon as pre-orders open.",
    };
  }
  if (mode === "CLOSED")
    return {
      button: "pre-orders closed",
      note: "Pre-orders have closed. This opens again at launch.",
    };
  return {
    button: "available at launch",
    note: "We're taking pre-orders right now. This one opens at launch.",
  };
}

/** "4d 10h", "10h 47m" or "47m" until a time. */
export function timeLeft(iso: string, now: number): string {
  const ms = Math.max(0, Date.parse(iso) - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Ticks once a second (or every `ms`) for countdowns. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

/** "₹900" from paise. */
export function reserveText(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/** "Reserve ₹500 today, ₹900 on bags over ₹4,000." */
export function reserveRuleText(status: PreorderPublicStatus): string {
  if (status.reserveLow === status.reserveHigh)
    return `Reserve ${reserveText(status.reserveLow)} today.`;
  return `Reserve ${reserveText(status.reserveLow)} today, ${reserveText(status.reserveHigh)} on bags over ${reserveText(status.reserveThreshold)}.`;
}
