"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminCard, AdminInput, Field, useToast } from "./ui";

interface Values {
  moversCount: string;
  homeVideoDesktopUrl: string;
  homeVideoMobileUrl: string;
}

/** Homepage bits staff change now and then: the reviews number and the
 * "Designed to Move and Play" videos. */
export function HomepageSettingsForm({
  initial,
  canManage,
}: {
  initial: Values;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== baseline;

  function set(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const count = values.moversCount.trim();
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moversCount: count ? Number(count) : null,
        homeVideoDesktopUrl: values.homeVideoDesktopUrl.trim() || null,
        homeVideoMobileUrl: values.homeVideoMobileUrl.trim() || null,
      }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    setSaving(false);
    if (!data?.ok) {
      toast(data?.error ?? "That didn't save. Try again.", "error");
      return;
    }
    setBaseline(JSON.stringify(values));
    toast("Saved. The homepage updates in a few seconds.", "success");
    router.refresh();
  }

  const disabled = !canManage || saving;

  return (
    <AdminCard>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-onwei-blue">Homepage</h2>
          <p className="text-sm text-onwei-blue/70">
            The reviews heading and the &ldquo;Designed to Move and Play&rdquo;
            video.
          </p>
        </div>
        <Field
          label="Number of happy movers"
          hint="Shows as “Chosen by 1,000+ everyday movers”. Leave empty to show “Chosen by everyday movers”."
        >
          <AdminInput
            type="number"
            min={1}
            inputMode="numeric"
            value={values.moversCount}
            onChange={(e) => set("moversCount", e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field
          label="Video for computers (YouTube, wide)"
          hint="A normal YouTube link. Plays in a wide 16:9 frame."
        >
          <AdminInput
            value={values.homeVideoDesktopUrl}
            onChange={(e) => set("homeVideoDesktopUrl", e.target.value)}
            placeholder="https://youtu.be/..."
            disabled={disabled}
          />
        </Field>
        <Field
          label="Video for phones (YouTube Short, tall)"
          hint="A YouTube Shorts link. Plays in a tall 9:16 frame. If one of the two is empty, the other is used for both."
        >
          <AdminInput
            value={values.homeVideoMobileUrl}
            onChange={(e) => set("homeVideoMobileUrl", e.target.value)}
            placeholder="https://youtube.com/shorts/..."
            disabled={disabled}
          />
        </Field>
        {canManage ? (
          <div className="flex justify-end">
            <AdminButton type="submit" disabled={!dirty || saving}>
              {saving ? "Saving..." : "Save"}
            </AdminButton>
          </div>
        ) : null}
      </form>
    </AdminCard>
  );
}
