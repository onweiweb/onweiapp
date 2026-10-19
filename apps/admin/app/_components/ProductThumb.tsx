"use client";

import { useState } from "react";

/** Small product photo for lists. Shows a "No photo" box when there is no
 * photo or it fails to load, instead of a broken-image icon. */
export function ProductThumb({ url }: { url: string | undefined }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-onwei-blue/10 text-center text-[0.5625rem] uppercase leading-tight text-onwei-blue/50">
        No photo
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from Blob/public URL
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  );
}
