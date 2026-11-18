"use client";

import type { PreorderPublicStatus, PreorderPublicTier } from "@onwei/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Image from "@/_components/ScaledImage";
import { track } from "../../../lib/analytics/track";
import {
  reserveText,
  timeLeft,
  useNow,
  usePreorderStatus,
} from "./usePreorderStatus";

// Figma "Pre-order Pop-up" desktop (1257:6055) and mobile sheet (1257:6666).
// Shown once per visit while pre-orders are live, in place of the sign-in
// pop-up. "Reserve" goes to the shop, where every pre-order product has a
// Reserve button.
export const PREORDER_POPUP_SEEN = "onwei_preorder_popup_seen";
const SKIP_PREFIXES = [
  "/ontheway",
  "/insider",
  "/privacy",
  "/terms",
  "/checkout",
  "/preorder",
  "/account",
  "/login",
];

function units(iso: string, now: number) {
  const ms = Math.max(0, Date.parse(iso) - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    { value: pad(Math.floor(ms / 86_400_000)), label: "days" },
    { value: pad(Math.floor((ms % 86_400_000) / 3_600_000)), label: "hours" },
    { value: pad(Math.floor((ms % 3_600_000) / 60_000)), label: "minutes" },
    { value: pad(Math.floor((ms % 60_000) / 1000)), label: "seconds" },
  ];
}

function plus(tier: PreorderPublicTier, short: boolean): string | null {
  if (!tier.giftLabel) return null;
  return short ? `+ ${tier.giftLabel}` : `Plus ${tier.giftLabel}`;
}

function Countdown({
  endsAt,
  now,
  mobile,
}: {
  endsAt: string;
  now: number;
  mobile: boolean;
}) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center overflow-hidden rounded-[1.25rem] bg-onwei-green text-center text-onwei-blue ${mobile ? "gap-2 px-[0.875rem] py-3" : "gap-3 p-4"}`}
    >
      <p className="font-grotesk text-[length:max(0.75rem,11px)]">Closes in:</p>
      <div
        className={`flex w-full items-center justify-between ${mobile ? "px-2" : ""}`}
      >
        {units(endsAt, now).map((u) => (
          <div
            key={u.label}
            className="flex flex-col items-center gap-[0.375rem]"
          >
            <span
              className={`font-display font-bold uppercase leading-[0.9] ${mobile ? "text-[length:max(2rem,24px)]" : "text-[length:max(1.875rem,22px)]"}`}
            >
              {u.value}
            </span>
            <span className="font-grotesk text-[length:max(0.6875rem,10px)]">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tag({ tier, dark }: { tier: PreorderPublicTier; dark: boolean }) {
  if (tier.state === "LIVE")
    return (
      <span className="flex shrink-0 items-center gap-[0.375rem] rounded-full bg-onwei-green px-3 py-[0.375rem] max-desk:gap-[0.3125rem] max-desk:px-[0.625rem] max-desk:py-[0.3125rem]">
        <Image
          src="/images/preorder/live-dot.svg"
          alt=""
          width={8}
          height={8}
          aria-hidden
        />
        <span className="whitespace-nowrap font-grotesk text-[length:max(0.6875rem,10px)] font-medium uppercase tracking-[0.06em] text-onwei-blue">
          Live now
        </span>
      </span>
    );
  if (tier.state === "CLOSED")
    return (
      <span
        className={`flex shrink-0 items-center rounded-full border px-3 py-[0.375rem] max-desk:px-[0.625rem] max-desk:py-[0.3125rem] ${dark ? "border-onwei-white text-onwei-white" : "border-onwei-blue text-onwei-blue"}`}
      >
        <span className="whitespace-nowrap font-grotesk text-[length:max(0.6875rem,10px)] font-medium uppercase tracking-[0.06em]">
          Closed
        </span>
      </span>
    );
  return (
    <span className="flex shrink-0 items-center gap-[0.375rem] rounded-full bg-onwei-blue px-3 py-[0.375rem] max-desk:gap-[0.3125rem] max-desk:px-[0.625rem] max-desk:py-[0.3125rem]">
      <Image
        src="/images/preorder/lock.svg"
        alt=""
        width={12}
        height={14}
        aria-hidden
        className="max-desk:h-3 max-desk:w-[0.625rem]"
      />
      <span className="whitespace-nowrap font-grotesk text-[length:max(0.6875rem,10px)] font-medium uppercase tracking-[0.06em] text-onwei-white">
        Locked
      </span>
    </span>
  );
}

/** A finished or upcoming tier (beige when closed, purple when locked). */
function SideCard({
  tier,
  now,
  mobile,
}: {
  tier: PreorderPublicTier;
  now: number;
  mobile: boolean;
}) {
  const closed = tier.state === "CLOSED";
  return (
    <div
      className={`flex flex-col items-start border border-onwei-blue text-onwei-blue ${closed ? "bg-onwei-beige" : "bg-onwei-purple"} ${mobile ? "min-w-0 flex-1 gap-[0.375rem] self-stretch rounded-[1.25rem] px-4 py-[0.875rem]" : "h-[17.25rem] min-w-0 flex-1 justify-between rounded-[1.875rem] p-7"}`}
    >
      <div
        className={`flex w-full justify-between gap-2 ${mobile ? "flex-wrap items-center" : "items-start"}`}
      >
        <div className="flex flex-col gap-1 whitespace-nowrap">
          <p
            className={`font-display uppercase ${mobile ? "text-[length:max(0.9375rem,13px)] font-semibold" : "text-[length:max(1.375rem,16px)] font-bold"}`}
          >
            {tier.label}
          </p>
          {mobile ? null : (
            <p className="font-grotesk text-[length:max(0.75rem,11px)]">
              Days {tier.firstDay}–{tier.lastDay}
            </p>
          )}
        </div>
        <Tag tier={tier} dark={false} />
      </div>
      <div
        className={`flex w-full flex-col items-start ${mobile ? "gap-[0.375rem]" : "gap-[0.625rem]"}`}
      >
        <p
          className={`relative flex items-baseline whitespace-nowrap ${mobile ? "gap-1" : "gap-[0.375rem]"} ${closed ? "text-onwei-purple" : ""}`}
        >
          <span
            className={`font-display font-bold leading-[0.9] ${mobile ? "text-[length:max(2rem,24px)] tracking-[-0.02em]" : "text-[length:max(4.5rem,40px)] tracking-[-0.03em]"}`}
          >
            {tier.percent}
          </span>
          <span
            className={`font-grotesk font-medium uppercase ${mobile ? "text-[length:max(0.6875rem,10px)]" : "text-[length:max(0.9375rem,12px)]"}`}
          >
            % off
          </span>
          {closed ? (
            <span
              aria-hidden
              className={`absolute left-[-0.25rem] -rotate-6 rounded-[2px] bg-onwei-blue ${mobile ? "top-[0.875rem] h-[0.15625rem] w-[2.5625rem]" : "top-[1.75rem] h-[0.1875rem] w-[5.0625rem]"}`}
            />
          ) : null}
        </p>
        {plus(tier, mobile) ? (
          <p
            className={`font-grotesk leading-[1.4] ${mobile ? "text-[length:max(0.6875rem,10px)]" : "text-[length:max(0.875rem,11px)]"}`}
          >
            {plus(tier, mobile)}
          </p>
        ) : null}
        <p
          className={`font-display font-medium uppercase ${mobile ? "text-[length:max(0.6875rem,10px)] tracking-[0.04em]" : "text-[length:max(0.8125rem,11px)] tracking-[0.04em]"}`}
        >
          {closed
            ? "that lap’s done"
            : `Opens in ${timeLeft(tier.startsAt, now)}`}
        </p>
      </div>
    </div>
  );
}

function LiveCard({
  tier,
  now,
  mobile,
  wide = false,
}: {
  tier: PreorderPublicTier;
  now: number;
  mobile: boolean;
  /** Fill its wrapper (the desktop row wraps it for the "you are here" note). */
  wide?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-start bg-onwei-blue text-onwei-white drop-shadow-[0_1.125rem_1.25rem_rgba(22,24,69,0.28)] ${mobile ? "w-full gap-[0.625rem] rounded-[1.5rem] px-5 pb-4 pt-[1.125rem]" : `${wide ? "w-full" : "min-w-0 flex-1"} gap-6 rounded-[1.875rem] px-7 pb-7 pt-[1.875rem]`}`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex flex-col gap-1 whitespace-nowrap max-desk:gap-[0.1875rem]">
          <p
            className={`font-display uppercase ${mobile ? "text-[length:max(1.25rem,16px)] font-semibold" : "text-[length:max(1.375rem,16px)] font-bold"}`}
          >
            {tier.label}
          </p>
          <p className="font-grotesk text-[length:max(0.75rem,11px)] text-onwei-purple max-desk:text-[length:max(0.6875rem,10px)]">
            Days {tier.firstDay}–{tier.lastDay}
          </p>
        </div>
        <Tag tier={tier} dark />
      </div>
      <div
        className={`flex w-full flex-col items-start ${mobile ? "gap-1" : "gap-2"}`}
      >
        <p className="flex items-baseline gap-[0.375rem] whitespace-nowrap">
          <span
            className={`font-display font-bold leading-[0.9] ${mobile ? "text-[length:max(3.25rem,36px)] tracking-[-0.03em]" : "text-[length:max(5.5rem,48px)] tracking-[-0.03em]"}`}
          >
            {tier.percent}
          </span>
          <span
            className={`font-grotesk font-medium uppercase ${mobile ? "text-[length:max(0.875rem,12px)]" : "text-[length:max(0.9375rem,12px)]"}`}
          >
            % off
          </span>
        </p>
        {plus(tier, false) ? (
          <p
            className={`font-grotesk leading-[1.4] ${mobile ? "text-[length:max(0.8125rem,11px)]" : "text-[length:max(0.875rem,11px)]"}`}
          >
            {plus(tier, false)}
          </p>
        ) : null}
        {mobile ? null : (
          <Countdown endsAt={tier.endsAt} now={now} mobile={false} />
        )}
      </div>
      {mobile ? <Countdown endsAt={tier.endsAt} now={now} mobile /> : null}
    </div>
  );
}

function Body({
  status,
  now,
  onClose,
  titleId,
}: {
  status: PreorderPublicStatus;
  now: number;
  onClose: () => void;
  titleId: string;
}) {
  const live = status.tiers[status.liveIndex]!;
  const next = status.tiers[status.liveIndex + 1];
  const reserve = reserveText(status.reserveAmount);
  const daysLeft = status.endsAt
    ? Math.max(1, Math.ceil((Date.parse(status.endsAt) - now) / 86_400_000))
    : 0;
  const urgency = next
    ? `${next.label} starts in ${timeLeft(next.startsAt, now)} and the saving drops to ${next.percent}%.`
    : `Pre-orders close in ${timeLeft(live.endsAt, now)}.`;
  const holds = `${reserve} holds your product and is redeemable against the final discounted value.`;
  const others = status.tiers.filter((_, i) => i !== status.liveIndex);
  const reserveButton = (mobile: boolean) => (
    <Link
      href="/collection/all"
      onClick={onClose}
      className={`flex items-center justify-center rounded-full bg-onwei-blue font-display font-medium uppercase text-onwei-white ${mobile ? "w-full px-6 py-4 text-[length:max(0.9375rem,13px)] tracking-[0.06em]" : "w-[21.25rem] px-10 py-5 text-[length:max(1rem,13px)] tracking-[0.06em]"}`}
    >
      Reserve for {reserve}
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <div className="relative hidden w-[65rem] flex-col items-start gap-6 rounded-[1.875rem] bg-onwei-green px-14 pb-9 pt-11 text-onwei-blue drop-shadow-[0_1.875rem_2.5rem_rgba(22,24,69,0.35)] desk:flex">
        <div className="flex w-full flex-col items-start gap-3">
          <span className="rounded-full bg-onwei-blue px-3 py-[0.375rem] font-grotesk text-[length:max(0.6875rem,10px)] font-medium uppercase tracking-[0.06em] text-onwei-white">
            Day {status.day} of {status.totalDays} &nbsp;·&nbsp; Pre-orders
            close in {daysLeft} {daysLeft === 1 ? "day" : "days"}
          </span>
          <div className="relative">
            <h2
              id={titleId}
              className="font-display text-[length:max(3rem,30px)] font-bold uppercase leading-[0.9]"
            >
              We&apos;re celebrating our
              <br />
              launch, &amp; you&apos;re invited!
            </h2>
            <Image
              src="/images/preorder/underline.svg"
              alt=""
              width={181}
              height={2.631}
              aria-hidden
              className="absolute left-[23.9375rem] top-[5.3125rem]"
            />
          </div>
          <p className="font-grotesk text-[length:max(1rem,12px)] leading-[1.5]">
            It&apos;s our day and we want to give you something special!
            <br />
            PS - These savings won&apos;t come around again!
          </p>
        </div>
        <div className="relative w-full pt-12">
          <div className="grid w-full auto-cols-[minmax(0,1fr)] grid-flow-col items-end gap-4">
            {status.tiers.map((tier, index) =>
              index === status.liveIndex ? (
                <div key={index} className="relative min-w-0 flex-1">
                  <p className="absolute left-[2.625rem] top-[-3.3125rem] whitespace-nowrap font-script text-[length:max(1.25rem,15px)] uppercase leading-none">
                    you are here
                  </p>
                  <Image
                    src="/images/preorder/arrow.svg"
                    alt=""
                    width={18.7}
                    height={40.8}
                    aria-hidden
                    className="absolute left-[10.75rem] top-[-2.875rem] -rotate-[25deg]"
                  />
                  <LiveCard tier={tier} now={now} mobile={false} wide />
                </div>
              ) : (
                <SideCard key={index} tier={tier} now={now} mobile={false} />
              ),
            )}
          </div>
        </div>
        <div className="h-px w-full bg-onwei-blue" />
        <div className="flex w-full items-center gap-10">
          {reserveButton(false)}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]">
              {holds}
            </p>
            <p className="font-display text-[length:max(1.25rem,15px)] font-semibold leading-[1.25]">
              {urgency}
            </p>
          </div>
        </div>
        <Image
          src="/images/preorder/player.svg"
          alt=""
          width={128}
          height={209}
          aria-hidden
          className="pointer-events-none absolute left-[48.5rem] top-[1.1875rem]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-6 top-6 size-11"
        >
          <Image
            src="/images/preorder/close.svg"
            alt=""
            width={44}
            height={44}
            aria-hidden
          />
        </button>
      </div>

      {/* Mobile sheet */}
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col items-start gap-3 overflow-y-auto rounded-t-[1.875rem] bg-onwei-green px-5 pb-6 pt-[1.875rem] text-onwei-blue drop-shadow-[0_-0.625rem_1.25rem_rgba(22,24,69,0.35)] desk:hidden">
        <div className="flex w-full flex-col items-start gap-[0.625rem]">
          <span className="rounded-full bg-onwei-blue px-[0.625rem] py-[0.3125rem] font-grotesk text-[length:max(0.625rem,9px)] font-medium uppercase tracking-[0.06em] text-onwei-white">
            Day {status.day} of {status.totalDays} &nbsp;·&nbsp; Closes in{" "}
            {daysLeft} {daysLeft === 1 ? "day" : "days"}
          </span>
          <div className="relative">
            <h2 className="font-display text-[length:max(2.25rem,26px)] font-bold uppercase leading-[0.9]">
              We’re celebrating
              <br />
              our launch, &amp;
              <br />
              you’re invited!
            </h2>
            <Image
              src="/images/preorder/underline-mobile.svg"
              alt=""
              width={136}
              height={1.977}
              aria-hidden
              className="absolute left-[7.125rem] top-[5.9375rem]"
            />
          </div>
          <p className="w-full font-grotesk text-[length:max(0.8125rem,11px)] leading-[1.5]">
            It&apos;s our day and we want to give you something special!
            <br />
            PS - These savings won&apos;t come around again!
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-[0.625rem] pt-[1.625rem]">
          <LiveCard tier={live} now={now} mobile />
          {others.length ? (
            <div className="flex w-full items-stretch gap-[0.625rem]">
              {others.map((tier) => (
                <SideCard key={tier.label} tier={tier} now={now} mobile />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          <p className="w-full text-center font-display text-[length:max(1rem,13px)] font-semibold leading-[1.25]">
            {urgency}
          </p>
          {reserveButton(true)}
          <p className="w-full text-center font-grotesk text-[length:max(0.6875rem,10px)] leading-[1.5]">
            {holds}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 size-9"
        >
          <Image
            src="/images/preorder/close-mobile.svg"
            alt=""
            width={36}
            height={36}
            aria-hidden
          />
        </button>
      </div>
    </>
  );
}

export function PreorderPopup() {
  const status = usePreorderStatus();
  const pathname = usePathname();
  const now = useNow(1000);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const skip = SKIP_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (skip || !status?.live) return;
    if (/bot|crawl|spider/i.test(navigator.userAgent)) return;
    try {
      if (sessionStorage.getItem(PREORDER_POPUP_SEEN)) return;
    } catch {
      return;
    }
    const timer = setInterval(() => {
      if (document.querySelector('[role="dialog"]')) return;
      clearInterval(timer);
      setVisible(true);
      track("preorder_popup_shown", {
        tier: status.tiers[status.liveIndex]?.label ?? "",
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [skip, status]);

  function close() {
    setVisible(false);
    try {
      sessionStorage.setItem(PREORDER_POPUP_SEEN, "1");
    } catch {
      // Private mode: it just shows again next page.
    }
  }

  useEffect(() => {
    if (!visible) return;
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!visible || !status?.live) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(22,24,69,0.62)] desk:items-center desk:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Image
        src="/images/preorder/confetti-left.svg"
        alt=""
        width={277.6}
        height={926.873}
        aria-hidden
        className="pointer-events-none absolute left-0 top-[0.8125rem] hidden desk:block"
      />
      <Image
        src="/images/preorder/confetti-right.svg"
        alt=""
        width={291.909}
        height={955.7}
        aria-hidden
        className="pointer-events-none absolute right-[0.9375rem] top-[0.1875rem] hidden desk:block"
      />
      <Image
        src="/images/preorder/confetti-left-mobile.svg"
        alt=""
        width={47.365}
        height={716.442}
        aria-hidden
        className="pointer-events-none absolute left-[-1.0625rem] top-[7.9375rem] desk:hidden"
      />
      <Image
        src="/images/preorder/confetti-right-mobile.svg"
        alt=""
        width={35.815}
        height={593.557}
        aria-hidden
        className="pointer-events-none absolute right-[0.125rem] top-[14.375rem] desk:hidden"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full outline-none desk:w-auto desk:max-h-[calc(100dvh-3rem)] desk:overflow-y-auto"
      >
        <Body status={status} now={now} onClose={close} titleId={titleId} />
      </div>
    </div>
  );
}
