"use client";

import { useState } from "react";
import Image from "@/_components/ScaledImage";

/**
 * Poster first, YouTube only after a tap: nothing from YouTube loads (and no
 * YouTube cookie is set) until the visitor asks to play. `embedUrl` is built
 * on the server from the link in admin Settings (youtubeEmbedUrl in core);
 * null shows the poster alone, with no play button.
 */
export function YouTubeVideo({
  embedUrl,
  poster,
  posterAlt,
  title,
  className,
  sizes,
}: {
  embedUrl: string | null;
  poster: string;
  posterAlt: string;
  title: string;
  className: string;
  sizes: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {playing && embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          <Image
            src={poster}
            alt={posterAlt}
            fill
            sizes={sizes}
            className="object-cover"
          />
          {embedUrl ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play video: ${title}`}
              className="absolute inset-0 flex cursor-pointer items-center justify-center"
            >
              <Image
                src="/images/showcase/play-pause.svg"
                alt=""
                width={98}
                height={114}
                aria-hidden
                className="h-[4.4375rem] w-[3.8125rem] desk:h-[7.125rem] desk:w-[6.125rem]"
              />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
