import Image from "next/image";

export interface InstagramGridPhoto {
  url: string;
  altText: string | null;
}

// Extracted from the Homepage's InstagramSection (was page-local) — reused
// on Collection/PDP with the same photo set (Figma duplicates this section
// per-page rather than treating it as Homepage-only).
export function InstagramGrid({
  photos,
}: {
  photos: readonly InstagramGridPhoto[];
}) {
  return (
    <section className="flex flex-col items-center bg-onwei-green px-3 py-24 sm:px-6 lg:px-14">
      <div className="flex w-full max-w-[1440px] flex-col items-start gap-12">
        <div className="relative flex w-full flex-col items-center gap-3">
          <span className="relative flex items-center gap-2 font-script text-script-md uppercase text-onwei-blue">
            follow us on instagram
            <Image
              src="/images/instagram/arrow.svg"
              alt=""
              width={20}
              height={26}
              aria-hidden
              className="-rotate-[27deg]"
            />
          </span>
          <p className="font-display text-[48px] font-bold uppercase leading-[0.9] text-onwei-blue lg:text-[70px]">
            @OnweiMoves
          </p>
        </div>
        <div className="no-scrollbar flex w-full gap-4 overflow-x-auto">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className="relative h-[420px] w-[340px] shrink-0 overflow-hidden rounded-[30px]"
            >
              <Image
                src={photo.url}
                alt={photo.altText ?? `Onwei community photo ${index + 1}`}
                fill
                sizes="340px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
