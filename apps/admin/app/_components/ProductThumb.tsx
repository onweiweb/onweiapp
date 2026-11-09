"use client";

import { SafeImage } from "./SafeImage";

/** Small product photo for lists. */
export function ProductThumb({ url }: { url: string | undefined }) {
  return <SafeImage url={url} className="h-10 w-10 shrink-0 rounded-lg" />;
}
