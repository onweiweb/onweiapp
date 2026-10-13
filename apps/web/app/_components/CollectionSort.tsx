"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import type { ProductSort } from "@onwei/core";

// The Collection page used to read ?sort= on the server, which made every
// category switch and every sort change a fresh server render with database
// reads. Now the page is built once and cached (revalidated every minute), the
// server also sends each category's three orderings (made by core's
// sortProductList, so the sort rules stay in one place), and this file only
// picks which ordering to show. The choice is mirrored into the URL with
// replaceState so a sorted link still works, without any navigation.
// Type-only import above: nothing from @onwei/core runs in the browser.
interface SortContextValue {
  sort: ProductSort;
  setSort: (sort: ProductSort) => void;
}

const SortContext = createContext<SortContextValue>({
  sort: "featured",
  setSort: () => {},
});

function isSort(value: string | null): value is ProductSort {
  return value === "price-asc" || value === "price-desc";
}

// The URL is the single source of truth. The server and the first browser
// render both say "featured" (the cached page is always the default order),
// then React re-reads the real URL, so a shared sorted link settles into its
// order right after load.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getSnapshot(): ProductSort {
  const value = new URLSearchParams(window.location.search).get("sort");
  return isSort(value) ? value : "featured";
}

function getServerSnapshot(): ProductSort {
  return "featured";
}

export function CollectionSortProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sort = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSort = useCallback((next: ProductSort) => {
    const url = new URL(window.location.href);
    if (next === "featured") url.searchParams.delete("sort");
    else url.searchParams.set("sort", next);
    window.history.replaceState(null, "", url);
    listeners.forEach((listener) => listener());
  }, []);

  return (
    <SortContext.Provider value={{ sort, setSort }}>
      {children}
    </SortContext.Provider>
  );
}

export function useCollectionSort() {
  return useContext(SortContext);
}

// Shows a category's cards in the picked order. The cards are rendered on the
// server and handed in, `orders` lists product ids per ordering.
export function SortedItems({
  items,
  orders,
}: {
  items: readonly { id: string; node: React.ReactNode }[];
  orders: Record<ProductSort, readonly string[]>;
}) {
  const { sort } = useCollectionSort();
  const byId = new Map(items.map((item) => [item.id, item.node]));
  return (
    <>
      {orders[sort].map((id) => (
        <div key={id} className="contents">
          {byId.get(id)}
        </div>
      ))}
    </>
  );
}
