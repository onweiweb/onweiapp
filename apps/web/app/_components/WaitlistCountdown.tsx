"use client";

import { useSyncExternalStore } from "react";

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
// calls unless the store actually changed — returning Date.now() directly
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

// Figma node 945:4263 (web) / 945:4412 (mobile) — the "43 / 11 / 42 / 06"
// figures there are a stale design-time mock, not a literal countdown; the
// real target comes from SiteSetting.launchAt, admin-editable.
export function WaitlistCountdown({ launchAt }: { launchAt: string }) {
  const target = new Date(launchAt).getTime();
  // useSyncExternalStore, not useEffect+setState, is React's sanctioned way
  // to read a value that changes outside of React (the clock): it renders
  // the server-snapshot value (here, `target` itself, so diff=0 and every
  // unit shows as zero) during SSR and the first client render — so they
  // match and there's no hydration mismatch — then switches to the real
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
    <div className="flex w-full flex-col items-center justify-center gap-[18px] rounded-[20px] bg-onwei-green p-6 text-onwei-blue">
      <p className="w-full text-center font-grotesk text-[14px]">
        Open to a small group just for:
      </p>
      <div className="grid grid-cols-2 gap-x-14 gap-y-[18px] sm:flex sm:items-center sm:gap-14">
        {units.map(([label, value]) => (
          <div
            key={label}
            className="flex h-[93px] w-[73px] flex-col items-center gap-1.5"
          >
            <p className="font-display text-[48px] font-bold uppercase leading-[0.9] sm:text-[70px]">
              {pad(value)}
            </p>
            <p className="w-full text-center font-grotesk text-[14px]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
