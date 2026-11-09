"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

// Product card "add to cart": adds straight away when there's one option,
// otherwise opens the product page to pick a size or colour.
export function QuickAddButton({
  productId,
  slug,
  inStock,
  className,
}: {
  productId: string;
  slug: string;
  inStock: boolean;
  className: string;
}) {
  const { quickAdd } = useCart();
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      disabled={!inStock || working}
      onClick={async () => {
        setWorking(true);
        await quickAdd(productId, slug);
        setWorking(false);
      }}
      className={`${className} disabled:opacity-60`}
    >
      {!inStock ? "sold out" : working ? "adding..." : "add to cart"}
    </button>
  );
}
