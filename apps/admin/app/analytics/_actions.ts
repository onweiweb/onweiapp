"use server";

import { updateTag } from "next/cache";
import { checkAnalyticsRefreshRateLimit } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";

export type RefreshResult = { ok: true } | { ok: false; message: string };

/** Throws away the cached report numbers so the next load fetches fresh ones. */
export async function refreshAnalytics(): Promise<RefreshResult> {
  const { staffUserId } = await requirePageSession("waitlist:view");
  const { allowed } = await checkAnalyticsRefreshRateLimit(staffUserId);
  if (!allowed) {
    return {
      ok: false,
      message: "You've refreshed a lot just now. Wait a minute and try again.",
    };
  }
  updateTag("analytics");
  return { ok: true };
}
