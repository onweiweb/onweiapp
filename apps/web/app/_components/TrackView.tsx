"use client";

import { useEffect } from "react";
import type {
  AnalyticsEventName,
  AnalyticsEvents,
} from "../../lib/analytics/events";
import { track } from "../../lib/analytics/track";

// Sends one event when this renders, e.g. from a server-rendered page:
//   <TrackView event="product_viewed" props={{ product_id, product_slug }} />
// Props are matched to the event by type, so a wrong shape fails typecheck.
export function TrackView<E extends AnalyticsEventName>({
  event,
  props,
}: {
  event: E;
  props: AnalyticsEvents[E];
}) {
  const key = JSON.stringify(props);
  useEffect(() => {
    // Wait a tick so the provider has finished starting up.
    const id = window.setTimeout(() => track(event, props), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key]);
  return null;
}
