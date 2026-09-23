import { prisma } from "@onwei/database";
import type { InstagramPhotoItem } from "./types";

/** Shared Homepage + PDP Instagram grid (Figma duplicates this section
 * per-page with the same photo set) — one data layer, not a hardcoded
 * const per page. */
export async function listInstagramPhotos(): Promise<InstagramPhotoItem[]> {
  const photos = await prisma.instagramPhoto.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return photos.map((photo) => ({
    url: photo.imageUrl,
    altText: photo.altText,
  }));
}
