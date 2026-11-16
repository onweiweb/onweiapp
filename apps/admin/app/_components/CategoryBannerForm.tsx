"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminCard, useConfirm, useToast } from "./ui";

/**
 * Banner at the top of a category page (/collection/pickleball). Saved as
 * soon as it uploads. With no banner the page shows the illustrated header.
 */
export function CategoryBannerForm({
  categoryId,
  slug,
  initialUrl,
}: {
  categoryId: string;
  slug: string;
  initialUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);

  async function saveUrl(next: string | null) {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: next }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    return data?.ok ? null : (data?.error ?? "That didn't save. Try again.");
  }

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/categories/banner", {
      method: "POST",
      body: form,
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as {
      ok: boolean;
      url?: string;
      error?: string;
    } | null;
    if (!data?.ok || !data.url) {
      setBusy(false);
      toast(data?.error ?? "The banner didn't upload. Try again.", "error");
      return;
    }
    const error = await saveUrl(data.url);
    setBusy(false);
    if (error) {
      toast(error, "error");
      return;
    }
    setUrl(data.url);
    toast("Banner saved. The page updates within a minute.", "success");
    router.refresh();
  }

  async function remove() {
    const ok = await confirm({
      title: "Remove the banner?",
      message: "The page goes back to the illustrated header.",
      confirmLabel: "Remove banner",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const error = await saveUrl(null);
    setBusy(false);
    if (error) {
      toast(error, "error");
      return;
    }
    setUrl(null);
    toast("Banner removed.", "success");
    router.refresh();
  }

  return (
    <AdminCard className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-onwei-blue">Page banner</h2>
        <p className="text-sm text-onwei-blue/70">
          A photo or GIF across the top of onwei.in/collection/{slug}. Best
          about 1440 by 420 for computers; phones crop it to a little taller.
          JPEG, PNG, WebP or GIF, up to 8MB.
        </p>
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Current banner"
          className="aspect-[1440/420] w-full rounded-lg object-cover"
        />
      ) : (
        <p className="text-sm text-onwei-blue/60">
          No banner yet, the page shows the illustrated header.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
          className="text-sm"
        />
        {url ? (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={remove}
            disabled={busy}
          >
            Remove banner
          </AdminButton>
        ) : null}
        {busy ? <span className="text-sm">Working...</span> : null}
      </div>
    </AdminCard>
  );
}
