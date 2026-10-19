"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type {
  AnalyticsEventName,
  AnalyticsEvents,
} from "../../lib/analytics/events";
import { track } from "../../lib/analytics/track";

type TrackedEvent = {
  [E in AnalyticsEventName]: { event: E; props: AnalyticsEvents[E] };
}[AnalyticsEventName];

// A normal link that also sends one analytics event when clicked. Works from
// server components: pass the event and its details as plain data.
export function TrackedLink({
  analytics,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { analytics?: TrackedEvent }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (analytics) track(analytics.event, analytics.props);
        onClick?.(event);
      }}
    />
  );
}
