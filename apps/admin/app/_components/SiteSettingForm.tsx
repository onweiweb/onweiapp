"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput, AdminSelect } from "./ui";

type SiteMode = "WAITLIST" | "PREORDERS" | "LIVE";

const MODE_OPTIONS: Array<{
  value: SiteMode;
  label: string;
  consequence: string;
}> = [
  {
    value: "WAITLIST",
    label: "Waitlist only",
    consequence:
      "Every visitor is sent to the coming-soon page, nothing else on the site is reachable.",
  },
  {
    value: "PREORDERS",
    label: "Pre-orders open",
    consequence: "Visitors can browse the store and place pre-orders.",
  },
  {
    value: "LIVE",
    label: "Fully live",
    consequence: "The normal store, open to everyone, with regular checkout.",
  },
];

function toDatetimeLocalValue(iso: string): string {
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the viewer's
  // own timezone, not the UTC ISO string the API returns.
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function SiteSettingForm({
  initialSiteMode,
  initialLaunchAt,
  initialAllowInternationalPhone,
  initialInstagramUrl,
  initialLinkedinUrl,
  initialFacebookUrl,
  initialYoutubeUrl,
  initialSpotifyUrl,
}: {
  initialSiteMode: SiteMode;
  initialLaunchAt: string;
  initialAllowInternationalPhone: boolean;
  initialInstagramUrl: string;
  initialLinkedinUrl: string;
  initialFacebookUrl: string;
  initialYoutubeUrl: string;
  initialSpotifyUrl: string;
}) {
  const router = useRouter();
  const [siteMode, setSiteMode] = useState<SiteMode>(initialSiteMode);
  const [launchAt, setLaunchAt] = useState(
    toDatetimeLocalValue(initialLaunchAt),
  );
  const [allowInternationalPhone, setAllowInternationalPhone] = useState(
    initialAllowInternationalPhone,
  );
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [facebookUrl, setFacebookUrl] = useState(initialFacebookUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [spotifyUrl, setSpotifyUrl] = useState(initialSpotifyUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedMode = MODE_OPTIONS.find((option) => option.value === siteMode);
  const modeChanged = siteMode !== initialSiteMode;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteMode,
          launchAt: new Date(launchAt).toISOString(),
          allowInternationalPhone,
          instagramUrl: instagramUrl.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          facebookUrl: facebookUrl.trim() || null,
          youtubeUrl: youtubeUrl.trim() || null,
          spotifyUrl: spotifyUrl.trim() || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSaved(true);
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid max-w-5xl gap-x-12 gap-y-8 lg:grid-cols-2"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="siteMode" className="text-sm font-medium">
            What the public site shows right now
          </label>
          <AdminSelect
            id="siteMode"
            value={siteMode}
            onChange={(event) => setSiteMode(event.target.value as SiteMode)}
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
          {selectedMode ? (
            <p
              className={`text-xs ${modeChanged ? "font-medium text-onwei-black" : "text-onwei-blue/70"}`}
            >
              {modeChanged
                ? "This takes effect within about 15 seconds of saving: "
                : ""}
              {selectedMode.consequence}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="launchAt" className="text-sm font-medium">
            Countdown target on the waitlist page
          </label>
          <AdminInput
            id="launchAt"
            type="datetime-local"
            value={launchAt}
            onChange={(event) => setLaunchAt(event.target.value)}
            className="w-full max-w-xs"
          />
          <p className="text-xs text-onwei-blue/70">
            The clock on the waitlist page counts down to this date and time
            (your own timezone).
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowInternationalPhone}
            onChange={(event) =>
              setAllowInternationalPhone(event.target.checked)
            }
          />
          Accept phone numbers from outside India on the waitlist form
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-onwei-blue/10 pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Social links</p>
          <p className="text-xs text-onwei-blue/70">
            Shown as icons in the site footer. Leave a field blank to hide that
            icon instead of linking somewhere empty.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          Instagram
          <AdminInput
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://www.instagram.com/onweimoves"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          LinkedIn
          <AdminInput
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            placeholder="https://www.linkedin.com/company/onwei"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Facebook
          <AdminInput
            value={facebookUrl}
            onChange={(event) => setFacebookUrl(event.target.value)}
            placeholder="https://www.facebook.com/onwei"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          YouTube
          <AdminInput
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://www.youtube.com/@onwei"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Spotify
          <AdminInput
            value={spotifyUrl}
            onChange={(event) => setSpotifyUrl(event.target.value)}
            placeholder="https://open.spotify.com/user/onwei"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-2">
        {error ? <p className="text-sm text-onwei-black">{error}</p> : null}
        {saved ? <p className="text-sm text-green-700">Saved.</p> : null}

        <AdminButton type="submit" disabled={submitting} className="w-fit">
          {submitting ? "Saving..." : "Save changes"}
        </AdminButton>
      </div>
    </form>
  );
}
