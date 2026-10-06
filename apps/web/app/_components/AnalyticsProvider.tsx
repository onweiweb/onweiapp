"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getFirstTouch, getVisitId } from "../../lib/analytics/attribution";
import { pageTypeFromPath } from "../../lib/analytics/pageType";
import { markAnalyticsReady, track } from "../../lib/analytics/track";

const SCROLL_STEPS = [25, 50, 75, 100] as const;

type PostHog = (typeof import("posthog-js"))["default"];
let initPromise: Promise<PostHog> | null = null;

// Sets PostHog up once per tab. Cookieless: no cookie is set and no banner
// is needed. Pageviews are sent by hand (below) so the very first one already
// carries the page type and where the visitor came from.
function ensurePosthog(key: string): Promise<PostHog> {
  initPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
      // PostHog counts visitors with a daily-rotating hash instead of a
      // cookie. Not in this version's typings, so passed through loosely.
      ...({ cookieless_mode: "always" } as object),
      persistence: "memory",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      person_profiles: "never",
    });
    const touch = getFirstTouch();
    posthog.register({
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      visit_id: getVisitId(),
      ft_utm_source: touch.utmSource,
      ft_utm_medium: touch.utmMedium,
      ft_utm_campaign: touch.utmCampaign,
      ft_utm_content: touch.utmContent,
      ft_referrer_host: touch.referrerHost,
    });
    markAnalyticsReady();
    return posthog;
  });
  return initPromise;
}

// Reports how people use each page: the pageview itself, how far they scroll,
// and how long until their first tap, key press or scroll. Loaded after the
// page is interactive. If the public key is not set (local dev, previews),
// nothing is loaded or sent.
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Remember where this visit came from even when analytics itself is off,
    // so a signup can still be tagged with it.
    getFirstTouch();
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const shownAt = performance.now();

    void ensurePosthog(key).then((posthog) => {
      if (cancelled) return;
      posthog.register({ page_type: pageTypeFromPath(pathname) });
      posthog.capture("$pageview");

      const sent = new Set<number>();
      const onScroll = () => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const percent = (window.scrollY / scrollable) * 100;
        for (const step of SCROLL_STEPS) {
          if (percent >= step - 1 && !sent.has(step)) {
            sent.add(step);
            track("scroll_depth", { depth: step });
          }
        }
      };

      let interacted = false;
      const interact = (kind: "tap" | "key" | "scroll") => () => {
        if (interacted) return;
        interacted = true;
        track("first_interaction", {
          ms: Math.round(performance.now() - shownAt),
          kind,
        });
      };
      const onTap = interact("tap");
      const onKey = interact("key");
      const onFirstScroll = interact("scroll");

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("scroll", onFirstScroll, { passive: true });
      window.addEventListener("pointerdown", onTap, { passive: true });
      window.addEventListener("keydown", onKey);
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("scroll", onFirstScroll);
        window.removeEventListener("pointerdown", onTap);
        window.removeEventListener("keydown", onKey);
      });
    });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [pathname]);

  return null;
}
