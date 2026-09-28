import { unstable_cache } from "next/cache";
import {
  getActiveProductBySlug,
  listActiveCategories,
  listActiveProductsByCategorySlug,
  listComparableProducts,
  listFaqs,
  listInstagramPhotos,
  listMarqueeItems,
  listRelatedProducts,
  listSurfaceReviews,
  listValueProps,
} from "@onwei/core";

// Homepage/Collection/PDP call these directly with no cache config at all,
// so Next's default full-route cache renders them once at build/first-visit
// and serves that snapshot forever — an admin catalog/content edit never
// shows up on the live site without a redeploy. Wrapping each read in
// unstable_cache gives it a bounded staleness window instead: repeat
// requests within REVALIDATE_SECONDS are served from Next's data cache
// (no DB round trip), and edits appear within that window rather than
// never. Not real-time — same tradeoff already made for /waitlist's own
// 30s window (apps/web/app/waitlist/page.tsx).
const REVALIDATE_SECONDS = 60;
const TAGS = ["catalog"];

export const cachedGetActiveProductBySlug = unstable_cache(
  getActiveProductBySlug,
  ["catalog:getActiveProductBySlug"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListActiveCategories = unstable_cache(
  listActiveCategories,
  ["catalog:listActiveCategories"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListActiveProductsByCategorySlug = unstable_cache(
  listActiveProductsByCategorySlug,
  ["catalog:listActiveProductsByCategorySlug"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListComparableProducts = unstable_cache(
  listComparableProducts,
  ["catalog:listComparableProducts"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListFaqs = unstable_cache(listFaqs, ["catalog:listFaqs"], {
  revalidate: REVALIDATE_SECONDS,
  tags: TAGS,
});

export const cachedListInstagramPhotos = unstable_cache(
  listInstagramPhotos,
  ["catalog:listInstagramPhotos"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListMarqueeItems = unstable_cache(
  listMarqueeItems,
  ["catalog:listMarqueeItems"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListRelatedProducts = unstable_cache(
  listRelatedProducts,
  ["catalog:listRelatedProducts"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListSurfaceReviews = unstable_cache(
  listSurfaceReviews,
  ["catalog:listSurfaceReviews"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);

export const cachedListValueProps = unstable_cache(
  listValueProps,
  ["catalog:listValueProps"],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
);
