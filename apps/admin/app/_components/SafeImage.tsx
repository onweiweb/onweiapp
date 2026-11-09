"use client";

import { useState } from "react";

/** A product photo that shows a "No photo" tile when the address is empty or
 * the image fails to load, instead of a broken-image icon. */
export function SafeImage({
  url,
  className = "",
}: {
  url: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span
        className={`flex items-center justify-center bg-onwei-blue/10 text-center text-[0.625rem] uppercase leading-tight text-onwei-blue/50 ${className}`}
      >
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
      className={`object-cover ${className}`}
    />
  );
}
