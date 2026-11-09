"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import Image from "@/_components/ScaledImage";

export const NO_PHOTO_SRC = "/images/products/no-photo.svg";

// A product photo that falls back to the shared "photo coming soon" tile when
// there is no photo or it fails to load, so a missing image never shows as a
// blank box or a broken-image icon.
export function ProductImage({
  src,
  alt,
  ...props
}: Omit<ComponentProps<typeof Image>, "src"> & {
  src: string | null | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? NO_PHOTO_SRC : src;
  return (
    <Image
      {...props}
      alt={alt}
      src={url}
      unoptimized={url === NO_PHOTO_SRC ? true : props.unoptimized}
      onError={() => setFailed(true)}
    />
  );
}
