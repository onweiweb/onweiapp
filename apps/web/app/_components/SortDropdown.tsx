"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track } from "../../lib/analytics/track";
import type { ProductSort } from "@onwei/core";

const SORT_LABELS: Record<ProductSort, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

// Figma (Collection frame, node 760:3925 "Filters") specs "SORT BY:
// FEATURED" with a chevron, real sorting behind it (packages/core's
// sortProductList), driven by a `sort` URL param rather than client state,
// so the selection survives navigation/sharing like the category tabs do.
export function SortDropdown({ value }: { value: ProductSort }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleChange(sort: ProductSort) {
    track("collection_sorted", {
      category_slug: pathname.split("/").pop() ?? "",
      sort,
    });
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 border-b border-onwei-blue px-1 pb-1 font-grotesk text-[length:max(0.875rem,11px)] uppercase text-onwei-blue">
      Sort by:
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as ProductSort)}
        className="bg-transparent font-grotesk text-[length:max(0.875rem,11px)] uppercase text-onwei-blue outline-none"
      >
        {(Object.keys(SORT_LABELS) as ProductSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}
