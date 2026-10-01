"use client";

import { useState } from "react";
import Image from "@/_components/ScaledImage";
import type { ProductImageDTO } from "@onwei/core";

// Figma (frame "PDP_draft 2", node 759:3026 "Img") only specs the static
// layout, 3 thumbnails + 1 large image, with no click/active state
// defined. Clicking a thumbnail swapping it into the main view is standard
// PDP gallery behavior, not literally shown in the file.
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImageDTO[];
  productName: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex] ?? null;
  const thumbnails = images
    .map((image, index) => ({ image, index }))
    .filter(({ index }) => index !== selectedIndex);

  return (
    <div className="flex w-full gap-4 desk:w-auto">
      {thumbnails.length > 0 ? (
        <div className="hidden w-[12.625rem] flex-col gap-4 desk:flex">
          {thumbnails.map(({ image, index }) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              className="relative aspect-square w-full overflow-hidden rounded-[1.25rem]"
            >
              <Image
                src={image.url}
                alt={image.altText ?? productName}
                fill
                sizes="202px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.875rem] border border-onwei-blue bg-onwei-green desk:h-[44.1875rem] desk:w-[39.75rem]">
        {selected ? (
          <Image
            src={selected.url}
            alt={selected.altText ?? productName}
            fill
            sizes="((min-width: 768px)) 636px, 100vw"
            className="object-contain p-10"
          />
        ) : null}
      </div>
    </div>
  );
}
