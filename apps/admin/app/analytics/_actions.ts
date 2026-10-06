"use server";

import { updateTag } from "next/cache";
import { clearAnalyticsCache } from "@onwei/core";
import { requirePageSession } from "../_lib/requirePageSession";

/** Throws away the cached report numbers so the next load fetches fresh ones. */
export async function refreshAnalytics() {
  await requirePageSession("waitlist:view");
  clearAnalyticsCache();
  updateTag("analytics");
}
