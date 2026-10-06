import posthog from "posthog-js";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

let ready = false;

export function markAnalyticsReady() {
  ready = true;
}

/** Sends one event. Does nothing until analytics is set up, so it is always safe to call. */
export function track<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsEvents[E],
) {
  if (!ready) return;
  try {
    posthog.capture(event, props);
  } catch {
    // Analytics must never break the page.
  }
}
