"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { OnweiMark } from "./OnweiMark";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: number, now: number): TimeLeft {
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// useSyncExternalStore requires getSnapshot to return a STABLE value between
// calls unless the store actually changed, returning Date.now() directly
// from getSnapshot changes on literally every call (including calls React
// makes just to check whether a re-render is needed), which trips React's
// "getSnapshot should be cached" infinite-loop guard. Caching the clock
// value here and only updating it inside the once-a-second interval (the
// same tick that notifies React via `callback`) is what actually makes this
// a valid external store.
let cachedNow = Date.now();

function subscribeToClock(callback: () => void): () => void {
  const interval = setInterval(() => {
    cachedNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(interval);
}

function getClockSnapshot(): number {
  return cachedNow;
}

// Figma node 945:4263 (web) / 945:4412 (mobile), the "43 / 11 / 42 / 06"
// figures there are a stale design-time mock, not a literal countdown; the
// real target comes from SiteSetting.launchAt, admin-editable.
export function WaitlistCountdown({
  launchAt,
  showCountdown,
}: {
  launchAt: string;
  showCountdown: boolean;
}) {
  return showCountdown ? <LiveCountdown launchAt={launchAt} /> : <ComingSoon />;
}

// Same box height as the clock so the card layout does not jump. The brand
// mark (the favicon shape) sits right of the text. The whole row is a loader:
// a faint copy underneath and a solid copy on top that fills in bottom to
// top (text and mark together), pauses, and restarts. Reduced-motion
// visitors get it fully filled.
function ComingSoonRow() {
  return (
    <div className="flex items-center justify-center gap-3 desk:gap-5">
      <p className="font-display text-[1.75rem] font-medium uppercase leading-[0.9] desk:text-[3.5rem]">
        Coming soon!!!
      </p>
      <OnweiMark className="h-[1.625rem] w-[2.125rem] shrink-0 desk:h-[2.75rem] desk:w-[3.5625rem]" />
    </div>
  );
}

function ComingSoon() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="flex min-h-[7.25rem] w-full items-center justify-center rounded-[1.25rem] bg-onwei-green p-4 text-onwei-blue desk:min-h-[11.8125rem] desk:p-6"
      animate={
        reduceMotion ? undefined : { rotate: [0, -1.2, 1, -0.8, 0.5, 0] }
      }
      transition={{
        duration: 1.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.5,
      }}
    >
      <div className="relative" role="status">
        <div className="opacity-20">
          <ComingSoonRow />
        </div>
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={false}
          animate={
            reduceMotion
              ? { clipPath: "inset(0% 0% 0% 0%)" }
              : { clipPath: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"] }
          }
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.6,
          }}
        >
          <ComingSoonRow />
        </motion.div>
      </div>
    </motion.div>
  );
}

function LiveCountdown({ launchAt }: { launchAt: string }) {
  const target = new Date(launchAt).getTime();
  // useSyncExternalStore, not useEffect+setState, is React's sanctioned way
  // to read a value that changes outside of React (the clock): it renders
  // the server-snapshot value (here, `target` itself, so diff=0 and every
  // unit shows as zero) during SSR and the first client render, so they
  // match and there's no hydration mismatch, then switches to the real
  // clock right after mount, ticking every second via the subscription.
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    () => target,
  );
  const timeLeft = getTimeLeft(target, now);

  const units: Array<[string, number]> = [
    ["days", timeLeft.days],
    ["hours", timeLeft.hours],
    ["minutes", timeLeft.minutes],
    ["seconds", timeLeft.seconds],
  ];

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-onwei-green p-3 text-onwei-blue desk:gap-[1.125rem] desk:p-6">
      <p className="w-full text-center font-grotesk text-[length:max(0.875rem,11px)]">
        Open to a small group just for:
      </p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 desk:flex desk:items-center desk:gap-14 desk:gap-y-[1.125rem]">
        {units.map(([label, value]) => (
          <div
            key={label}
            className="flex h-[3.5rem] w-[4.5625rem] flex-col items-center gap-1.5 desk:h-[5.8125rem]"
          >
            <motion.p
              key={value}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="font-display text-[1.75rem] font-bold uppercase leading-[0.9] desk:text-[4.375rem]"
            >
              {pad(value)}
            </motion.p>
            <p className="w-full text-center font-grotesk text-[length:max(0.875rem,11px)]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
