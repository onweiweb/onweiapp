import type { TrackingMatchResult } from "@onwei/core";

/** The reply for "Add tracking numbers", in plain words. */
export function trackingReply(
  result: Extract<TrackingMatchResult, { ok: true }>,
  noun: { one: string; many: string },
) {
  const n = result.matched.length;
  const parts: string[] = [];
  if (n > 0)
    parts.push(
      `${n} ${n === 1 ? noun.one : noun.many} now ${n === 1 ? "shows" : "show"} as booked.`,
    );
  if (result.alreadySaved > 0)
    parts.push(
      `${result.alreadySaved} ${result.alreadySaved === 1 ? "was" : "were"} already saved.`,
    );
  if (result.left.length > 0)
    parts.push(`${result.left.length} couldn't be matched, see below.`);
  return {
    ok: true,
    matched: result.matched,
    left: result.left,
    message: parts.join(" ") || "Nothing changed.",
  };
}

export const NOTHING_PASTED =
  "No tracking numbers found. Paste the tracking numbers (10 or more digits) from the iThink portal.";
