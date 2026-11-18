"use client";

import type { PreorderPublicTier } from "@onwei/core";
import Link from "next/link";
import Image from "@/_components/ScaledImage";
import { track } from "../../../lib/analytics/track";
import {
  reserveText,
  timeLeft,
  useNow,
  usePreorderStatus,
} from "./usePreorderStatus";

// Figma "Pre-order banner_draft 2" (1257:7003): sits directly under the site
// header and stays pinned to the top while scrolling. One card per tier:
// the live one green, upcoming ones purple with a lock, finished ones navy
// with a white outline and the percentage struck through. The whole banner
// links to the shop. Mobile: the cards swipe sideways, live tier first.

function offerText(tier: PreorderPublicTier): string {
  return tier.giftLabel ? `off + ${tier.giftLabel.toLowerCase()}` : "off";
}

function statusText(
  tier: PreorderPublicTier,
  index: number,
  liveIndex: number,
  now: number,
): string {
  if (tier.state === "CLOSED") return "Closed";
  if (tier.state === "LIVE") return `Closes in ${timeLeft(tier.endsAt, now)}`;
  return index === liveIndex + 1
    ? `Opens in ${timeLeft(tier.startsAt, now)}`
    : `Opens day ${tier.firstDay}`;
}

function LapCard({
  tier,
  status,
  mobile,
}: {
  tier: PreorderPublicTier;
  status: string;
  mobile: boolean;
}) {
  const closed = tier.state === "CLOSED";
  const live = tier.state === "LIVE";
  const box = closed
    ? "border border-onwei-white bg-onwei-blue text-onwei-white"
    : live
      ? "bg-onwei-green text-onwei-blue"
      : "bg-onwei-purple text-onwei-blue";
  const size = mobile
    ? "w-[12.25rem] shrink-0 gap-[0.375rem] rounded-[0.875rem] p-3"
    : "min-w-0 flex-1 gap-2 rounded-[1.125rem] px-4 py-[0.875rem]";
  return (
    <div className={`flex flex-col items-start ${box} ${size}`}>
      <div className="flex w-full items-center justify-between gap-2">
        <p
          className={`whitespace-nowrap font-display font-semibold uppercase ${mobile ? "text-[length:max(0.75rem,11px)]" : "text-[length:max(0.875rem,11px)]"}`}
        >
          {tier.label}
        </p>
        <span
          className={`flex shrink-0 items-center gap-[0.3125rem] rounded-full px-[0.625rem] ${mobile ? "py-[0.1875rem]" : "py-1"} ${closed ? "border border-onwei-white" : "bg-onwei-blue"}`}
        >
          {live ? (
            <Image
              src="/images/preorder/banner-live-dot.svg"
              alt=""
              width={6}
              height={6}
              aria-hidden
            />
          ) : !closed ? (
            <Image
              src="/images/preorder/banner-lock.svg"
              alt=""
              width={8.5}
              height={10.2}
              aria-hidden
            />
          ) : null}
          <span
            className={`whitespace-nowrap font-grotesk font-medium uppercase text-onwei-white ${mobile ? "text-[length:max(0.5625rem,9px)] tracking-[0.028em]" : "text-[length:max(0.625rem,9px)] tracking-[0.03em]"}`}
          >
            {status}
          </span>
        </span>
      </div>
      <p className="flex items-baseline gap-[0.375rem] whitespace-nowrap">
        <span
          className={`font-display font-bold leading-[0.95] ${mobile ? "text-[length:max(1.375rem,18px)]" : "text-[length:max(1.875rem,20px)]"} ${closed ? "line-through" : ""}`}
        >
          {tier.percent}%
        </span>
        <span
          className={`font-grotesk ${mobile ? "text-[length:max(0.625rem,9px)]" : "text-[length:max(0.75rem,10px)]"}`}
        >
          {offerText(tier)}
        </span>
      </p>
    </div>
  );
}

export function PreorderBanner() {
  const status = usePreorderStatus();
  const now = useNow(30_000);
  if (!status?.live) return null;
  const live = status.tiers[status.liveIndex];
  if (!live) return null;
  const isLast = status.liveIndex === status.tiers.length - 1;
  const reserve = reserveText(status.reserveAmount);
  const line = isLast
    ? `Last lap! Reserve yours for ${reserve} before pre-orders close.`
    : `Reserve yours for ${reserve}. The earlier you move, the more you save.`;
  const mobileOrder = [
    live,
    ...status.tiers.filter((_, i) => i !== status.liveIndex),
  ];

  return (
    <div className="sticky top-0 z-40 w-full bg-onwei-green py-2">
      <Link
        href="/collection/all"
        onClick={() => track("preorder_banner_clicked", { tier: live.label })}
        className="mx-auto block w-[calc(100%-2rem)] max-w-[85rem] text-onwei-blue desk:w-[calc(100%-5rem)]"
        aria-label={`Pre-orders are live. ${line}`}
      >
        {/* Desktop */}
        <div className="hidden items-center gap-6 rounded-[1.75rem] bg-onwei-blue py-[1.125rem] pl-7 pr-6 desk:flex">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-baseline gap-4 whitespace-nowrap">
              <p className="font-display text-[length:max(1.625rem,18px)] font-bold uppercase leading-none text-onwei-green">
                Pre-orders are live
              </p>
              <p className="truncate font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.4] text-onwei-white">
                {line}
              </p>
            </div>
            <div className="flex items-end gap-3">
              {status.tiers.map((tier, index) => (
                <LapCard
                  key={tier.label + index}
                  tier={tier}
                  mobile={false}
                  status={statusText(tier, index, status.liveIndex, now)}
                />
              ))}
            </div>
          </div>
          <div className="relative h-[7.25rem] w-[5.2115rem] shrink-0">
            <Image
              src="/images/preorder/banner-art.svg"
              alt=""
              width={83.384}
              height={150}
              aria-hidden
              className="absolute left-0 top-[-1.875rem]"
            />
          </div>
        </div>

        {/* Mobile */}
        <div className="flex flex-col gap-[0.625rem] overflow-hidden rounded-[1.375rem] bg-onwei-blue p-[0.875rem] desk:hidden">
          <div className="flex items-center gap-[0.625rem]">
            <div className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
              <p className="whitespace-nowrap font-display text-[length:max(1.125rem,15px)] font-bold uppercase leading-none text-onwei-green">
                Pre-orders are live
              </p>
              <p className="font-grotesk text-[length:max(0.6875rem,10px)] leading-[1.4] text-onwei-white">
                {line}
              </p>
            </div>
            <Image
              src="/images/preorder/banner-art-mobile.svg"
              alt=""
              width={35.577}
              height={64}
              aria-hidden
              className="shrink-0"
            />
          </div>
          <div className="-mr-[0.875rem] flex items-end gap-2 overflow-x-auto pr-[0.875rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mobileOrder.map((tier) => {
              const index = status.tiers.indexOf(tier);
              return (
                <LapCard
                  key={tier.label + index}
                  tier={tier}
                  mobile
                  status={statusText(tier, index, status.liveIndex, now)}
                />
              );
            })}
          </div>
        </div>
      </Link>
    </div>
  );
}
